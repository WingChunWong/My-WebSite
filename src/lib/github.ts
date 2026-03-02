export interface TimelineEvent {
  type: "commit" | "pr" | "issue" | "review" | "repo";
  title: string;
  url: string;
  repo: string;
  repoUrl: string;
  date: string;
  count?: number;
}

// ── Response types ──

interface SearchIssueNode {
  __typename: "Issue";
  title: string;
  url: string;
  createdAt: string;
  repository: { name: string; url: string };
}

interface SearchPRNode {
  __typename: "PullRequest";
  title: string;
  url: string;
  createdAt: string;
  repository: { name: string; url: string };
}

interface SearchResponse<T> {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

interface RepoNode {
  name: string;
  url: string;
  createdAt: string;
  isPrivate: boolean;
  owner: { login: string };
}

interface RepoResponse {
  nodes: RepoNode[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

interface CommitNode {
  committedDate: string;
  url: string;
}

interface CommitHistory {
  nodes: CommitNode[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

// ── GraphQL Queries ──

const SEARCH_QUERY = `
query($query: String!, $first: Int!, $after: String) {
  search(query: $query, type: ISSUE, first: $first, after: $after) {
    nodes {
      __typename
      ... on Issue {
        title
        url
        createdAt
        repository { name url }
      }
      ... on PullRequest {
        title
        url
        createdAt
        repository { name url }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const REPOS_QUERY = `
query($username: String!, $first: Int!, $after: String) {
  user(login: $username) {
    repositories(first: $first, after: $after, orderBy: {field: CREATED_AT, direction: DESC}, ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
      nodes { name url createdAt isPrivate owner { login } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const USER_ID_QUERY = `
query($username: String!) {
  user(login: $username) {
    id
  }
}`;

const REPO_COMMITS_QUERY = `
query($owner: String!, $name: String!, $authorId: ID!, $since: GitTimestamp!, $first: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(first: $first, since: $since, after: $after, author: {id: $authorId}) {
            nodes {
              committedDate
              url
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    }
  }
}`;

// ── API helpers ──

async function graphql<T extends object>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const json = (await response.json()) as
    | T
    | { errors: Array<{ message: string }> };
  if ("errors" in json) {
    throw new Error(
      `GitHub GraphQL error: ${(json as { errors: Array<{ message: string }> }).errors[0].message}`,
    );
  }
  return json as T;
}

// ── Search (Issues + PRs, paginated) ──

async function fetchAllSearchResults(
  token: string,
  searchQuery: string,
): Promise<(SearchIssueNode | SearchPRNode)[]> {
  const all: (SearchIssueNode | SearchPRNode)[] = [];
  let after: string | null = null;

  for (;;) {
    const result: {
      data: { search: SearchResponse<SearchIssueNode | SearchPRNode> };
    } = await graphql<{
      data: { search: SearchResponse<SearchIssueNode | SearchPRNode> };
    }>(token, SEARCH_QUERY, { query: searchQuery, first: 100, after });

    all.push(...result.data.search.nodes);

    if (!result.data.search.pageInfo.hasNextPage) break;
    after = result.data.search.pageInfo.endCursor;
  }

  return all;
}

// ── Repositories (paginated) ──

async function fetchAllRepositories(
  token: string,
  username: string,
): Promise<RepoNode[]> {
  const all: RepoNode[] = [];
  let after: string | null = null;

  for (;;) {
    const result: {
      data: { user: { repositories: RepoResponse } };
    } = await graphql<{
      data: { user: { repositories: RepoResponse } };
    }>(token, REPOS_QUERY, { username, first: 100, after });

    all.push(...result.data.user.repositories.nodes);

    if (!result.data.user.repositories.pageInfo.hasNextPage) break;
    after = result.data.user.repositories.pageInfo.endCursor;
  }

  return all;
}

// ── Commits (per-repo git history via GraphQL) ──

async function fetchUserNodeId(
  token: string,
  username: string,
): Promise<string> {
  const result = await graphql<{
    data: { user: { id: string } };
  }>(token, USER_ID_QUERY, { username });
  return result.data.user.id;
}

async function fetchRepoCommits(
  token: string,
  owner: string,
  name: string,
  authorId: string,
  since: string,
): Promise<CommitNode[]> {
  const all: CommitNode[] = [];
  let after: string | null = null;

  type RepoCommitResult = {
    data: {
      repository: {
        defaultBranchRef: {
          target: { history: CommitHistory };
        } | null;
      } | null;
    };
  };

  for (;;) {
    const result: RepoCommitResult = await graphql<RepoCommitResult>(
      token,
      REPO_COMMITS_QUERY,
      {
        owner,
        name,
        authorId,
        since,
        first: 100,
        after,
      },
    );

    const history: CommitHistory | undefined =
      result.data?.repository?.defaultBranchRef?.target?.history;
    if (!history) break;

    all.push(...history.nodes);
    if (!history.pageInfo.hasNextPage) break;
    after = history.pageInfo.endCursor;
  }

  return all;
}

// ── Batch processing with concurrency control ──

async function processBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 10,
): Promise<R[]> {
  const results: (R | null)[] = [];
  const batches = Math.ceil(items.length / concurrency);

  for (let b = 0; b < batches; b++) {
    const start = b * concurrency;
    const end = Math.min(start + concurrency, items.length);
    const batchItems = items.slice(start, end);

    const batchResults = await Promise.all(
      batchItems.map(async (item) => {
        try {
          return await fn(item);
        } catch (error) {
          console.error("Batch item error:", error);
          return null;
        }
      }),
    );

    results.push(...batchResults);
  }

  return results as R[];
}

async function fetchAllCommits(
  token: string,
  username: string,
  repos: RepoNode[],
  since: Date,
): Promise<TimelineEvent[]> {
  const authorId = await fetchUserNodeId(token, username);
  const sinceStr = since.toISOString();
  const events: TimelineEvent[] = [];
  const publicRepos = repos.filter((r) => !r.isPrivate);

  console.log(
    `Fetching commits for ${publicRepos.length} public repos (parallel, max 8 concurrent)`,
  );
  const startTime = Date.now();

  // Fetch commits in parallel with concurrency control
  const allCommitsResults = await processBatch(
    publicRepos,
    (repo) =>
      fetchRepoCommits(
        token,
        repo.owner.login,
        repo.name,
        authorId,
        sinceStr,
      ).then((commits) => ({ repo, commits })),
    8,
  );

  // Process results into events
  for (const result of allCommitsResults) {
    if (!result || !result.commits || result.commits.length === 0) continue;

    const repo = result.repo;
    for (const commit of result.commits) {
      events.push({
        type: "commit",
        title: "提交了代码",
        url: commit.url,
        repo: repo.name,
        repoUrl: repo.url,
        date: commit.committedDate,
      });
    }

    console.log(
      `  ${repo.owner.login}/${repo.name}: ${result.commits.length} commits`,
    );
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`Total commit events: ${events.length} (${elapsed}s)`);
  return events;
}

// ── Main entry ──

export async function fetchGitHubContributions(
  token: string,
  username: string,
  since: Date = new Date("2022-01-01"),
): Promise<TimelineEvent[]> {
  const sinceStr = since.toISOString().split("T")[0];
  const allEvents: TimelineEvent[] = [];

  console.log(
    `=== Starting GitHub data fetch for ${username} since ${sinceStr} ===`,
  );

  // Parallel fetch: issues, PRs, and repos (independent operations)
  console.log("Fetching issues, PRs, and repositories in parallel...");
  const startTime = Date.now();

  const [issues, prs, repos] = await Promise.all([
    fetchAllSearchResults(
      token,
      `author:${username} is:issue created:>=${sinceStr}`,
    ),
    fetchAllSearchResults(
      token,
      `author:${username} is:pr created:>=${sinceStr}`,
    ),
    fetchAllRepositories(token, username),
  ]);

  const issuesTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`Issues/PRs/Repos fetched in ${issuesTime}s`);

  // Sequential fetch: commits (depends on repos data)
  console.log("Fetching commits via repo history...");
  const commits = await fetchAllCommits(token, username, repos, since);

  // Issues
  for (const node of issues) {
    if (node.__typename !== "Issue") continue;
    allEvents.push({
      type: "issue",
      title: node.title,
      url: node.url,
      repo: node.repository.name,
      repoUrl: node.repository.url,
      date: node.createdAt,
    });
  }

  // Pull Requests
  for (const node of prs) {
    if (node.__typename !== "PullRequest") continue;
    allEvents.push({
      type: "pr",
      title: node.title,
      url: node.url,
      repo: node.repository.name,
      repoUrl: node.repository.url,
      date: node.createdAt,
    });
  }

  // Repositories created
  for (const repo of repos) {
    if (new Date(repo.createdAt) < since) continue;
    allEvents.push({
      type: "repo",
      title: repo.isPrivate ? "创建了私有仓库" : `创建了仓库 ${repo.name}`,
      url: repo.isPrivate ? "" : repo.url,
      repo: repo.isPrivate ? "私有仓库" : repo.name,
      repoUrl: repo.isPrivate ? "" : repo.url,
      date: repo.createdAt,
    });
  }

  // Commits
  allEvents.push(...commits);

  // Sort by date descending
  allEvents.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  console.log(`=== Total events collected: ${allEvents.length} ===`);

  return allEvents;
}
