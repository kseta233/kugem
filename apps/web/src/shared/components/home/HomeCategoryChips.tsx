type HomeCategory = 'All' | 'Action' | 'Puzzle' | 'Reflex' | 'Coming Soon'

interface HomeCategoryChipsProps {
  value: HomeCategory
  onChange: (value: HomeCategory) => void
}

const CATEGORIES: HomeCategory[] = ['All', 'Action', 'Puzzle', 'Reflex', 'Coming Soon']

export function HomeCategoryChips({ value, onChange }: HomeCategoryChipsProps) {
  return (
    <section className="home-chip-scroll" aria-label="Game categories">
      <div className="home-chip-row">
        {CATEGORIES.map((category) => {
          const selected = value === category
          return (
            <button
              key={category}
              type="button"
              className={`home-chip ${selected ? 'is-active' : ''}`.trim()}
              onClick={() => onChange(category)}
              aria-pressed={selected}
            >
              {category}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export type { HomeCategory }
