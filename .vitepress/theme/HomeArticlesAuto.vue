<script setup>
import { ref } from 'vue'
import articlesData from '../../public/articles.json'

const categoryConfig = [
  { title: '物理', id: 'physics', icon: '📚' },
  { title: '计算机', id: 'computer', icon: '💻' },
  { title: '生活', id: 'life', icon: '🌟' }
]

const categories = categoryConfig.map((category) => ({
  ...category,
  articles: articlesData
    .filter((article) => article.category === category.title)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})).filter((category) => category.articles.length > 0)

const expandedCategories = ref(new Set(categories.map((category) => category.id)))

const toggleCategory = (categoryId) => {
  if (expandedCategories.value.has(categoryId)) {
    expandedCategories.value.delete(categoryId)
  } else {
    expandedCategories.value.add(categoryId)
  }
}

const isExpanded = (categoryId) => {
  return expandedCategories.value.has(categoryId)
}
</script>

<template>
  <div class="home-articles-container">
    <div class="categories-section">
      <div
        v-for="category in categories"
        :key="category.id"
        class="category-block"
        :data-category="category.id"
      >
        <h2 class="category-heading">
          <button
            type="button"
            class="category-header"
            :aria-expanded="isExpanded(category.id)"
            :aria-controls="`${category.id}-articles`"
            @click="toggleCategory(category.id)"
          >
            <span class="category-header-left">
              <span class="category-icon" aria-hidden="true">
              {{ category.icon }}
              </span>
              <span class="category-title">{{ category.title }}</span>
              <span class="article-count">({{ category.articles.length }} 篇)</span>
            </span>
            <span class="expand-icon" :class="{ expanded: isExpanded(category.id) }" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </span>
          </button>
        </h2>

        <div
          v-show="isExpanded(category.id)"
          :id="`${category.id}-articles`"
          class="articles-list"
        >
          <a
            v-for="article in category.articles"
            :key="article.link"
            :href="article.link"
            class="article-card"
          >
            <div class="article-content">
              <h3 class="article-title">{{ article.title }}</h3>
              <p v-if="article.description" class="article-description">
                {{ article.description }}
              </p>
              <div v-if="article.tags && article.tags.length > 0" class="article-tags">
                <span
                  v-for="tag in article.tags"
                  :key="tag"
                  class="article-tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="article-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </a>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Container */
.home-articles-container {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--spacing-lg) var(--spacing-md);
}

/* Categories Section */
.categories-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
  align-items: start;
}

/* Category Block */
.category-block {
  background: var(--c-bg-card);
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--transition-base);
}

.category-block:hover {
  box-shadow: var(--shadow-md);
}

/* Category Header */
.category-heading {
  margin: 0;
  border: 0;
  padding: 0;
}

.category-header {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  user-select: none;
  transition: all var(--transition-base);
  border-bottom: 1px solid transparent;
}

.category-header:hover {
  background: var(--c-bg-soft);
}

.category-header:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
}

.category-header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.category-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--category-color, var(--vp-c-brand-1));
  border-radius: var(--radius-sm);
  color: white;
  transition: transform var(--transition-base);
  font-size: 1.5rem;
  line-height: 1;
}

.category-header:hover .category-icon {
  transform: scale(1.05);
}

.category-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0;
}

.article-count {
  font-size: 0.8125rem;
  color: var(--c-text-muted);
}

.expand-icon {
  width: 20px;
  height: 20px;
  transition: transform var(--transition-base);
  color: var(--c-text-muted);
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.expand-icon svg {
  width: 20px;
  height: 20px;
}

/* Category-specific colors */
.category-block[data-category="physics"] {
  --category-color: #3b82f6;
}

.category-block[data-category="computer"] {
  --category-color: #14b8a6;
}

.category-block[data-category="life"] {
  --category-color: #f97316;
}

/* Articles List */
.articles-list {
  padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

/* Article Card */
.article-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background: var(--c-bg-soft);
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: all var(--transition-base);
  cursor: pointer;
}

.article-card:hover {
  background: var(--c-bg-card);
  border-color: var(--category-color, var(--vp-c-brand-1));
  transform: translateX(2px);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
}

.article-content {
  flex: 1;
}

.article-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.article-description {
  font-size: 0.875rem;
  color: var(--c-text-secondary);
  margin: 0 0 var(--spacing-sm) 0;
  line-height: 1.5;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.article-tag {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  background: rgba(59, 130, 246, 0.1);
  color: var(--vp-c-brand-1);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.article-arrow {
  width: 18px;
  height: 18px;
  color: var(--c-text-muted);
  transition: all var(--transition-base);
  flex-shrink: 0;
  margin-left: var(--spacing-md);
}

.article-card:hover .article-arrow {
  color: var(--category-color, var(--vp-c-brand-1));
  transform: translateX(2px);
}

.article-arrow svg {
  width: 18px;
  height: 18px;
}

/* Responsive */
@media (max-width: 768px) {
  .home-articles-container {
    padding: var(--spacing-md);
  }

  .categories-section {
    grid-template-columns: 1fr;
  }

  .article-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .article-arrow {
    margin-left: 0;
    margin-top: var(--spacing-sm);
  }

  .category-header {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .articles-list {
    padding: var(--spacing-xs) var(--spacing-md) var(--spacing-md);
  }
}
</style>
