declare module "astro:content" {
  export type LoaderResult = unknown;

  export type CollectionConfig<T = unknown> = {
    loader?: LoaderResult;
    schema?: unknown;
    [key: string]: unknown;
  };

  export function defineCollection<T = unknown>(config: CollectionConfig<T>): unknown;

  export const collections: Record<string, unknown>;
}
