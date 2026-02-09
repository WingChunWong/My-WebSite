import React from 'react'
import { Title2, Body1, Button } from '@fluentui/react-components'

export default function Home() {
  return (
    <div>
      <main className="projects">
        <section className="fui-Card card-section">
          <Title2 as="h2">在線家課表</Title2>
          <Body1 as="p">用於管理和查看家課，便捷瀏覽作業清單。</Body1>
          <div className="card-actions">
            <Button as="a" href="/hw-list" appearance="secondary">訪問項目 ➜</Button>
          </div>
        </section>

        <section className="fui-Card card-section">
          <Title2 as="h2">百分比變化練習</Title2>
          <Body1 as="p">
            專注於百分比變化計算的練習網頁工具，提供求新值、求原值、算變化百分比等題型訓練，鞏固數學知識點，提升百分比運算能力。
          </Body1>
          <div className="card-actions">
            <Button as="a" href="/math-game" appearance="secondary">訪問項目 ➜</Button>
          </div>
        </section>
      </main>
    </div>
  )
}
