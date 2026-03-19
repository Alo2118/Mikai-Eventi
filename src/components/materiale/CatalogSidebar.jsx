import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { TIPO_PRODOTTO } from '../../lib/constants'

function FilterCheckbox({ checked, onChange, label, imageUrl }) {
  return (
    <label className="flex items-center gap-3 min-h-[48px] cursor-pointer rounded-lg px-2 hover:bg-gray-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-2 focus:ring-mikai-400 cursor-pointer shrink-0"
      />
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="w-6 h-6 object-contain rounded shrink-0"
        />
      )}
      <span className="text-base text-gray-700 leading-tight">{label}</span>
    </label>
  )
}

function FilterGroup({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 px-2">
        {title}
      </p>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

function SidebarContent({
  brands,
  sections,
  selectedBrandIds,
  selectedSectionIds,
  selectedTipi,
  onToggleBrand,
  onToggleSection,
  onToggleTipo,
}) {
  return (
    <div className="py-4 px-2 overflow-y-auto flex-1">
      <FilterGroup title="Brand">
        {brands.map((brand) => (
          <FilterCheckbox
            key={brand.id}
            checked={selectedBrandIds.includes(brand.id)}
            onChange={() => onToggleBrand(brand.id)}
            label={brand.nome}
            imageUrl={brand.logo_url}
          />
        ))}
        {brands.length === 0 && (
          <p className="text-sm text-gray-400 px-2 py-2">Nessun brand disponibile</p>
        )}
      </FilterGroup>

      <FilterGroup title="Distretto anatomico">
        {sections.map((section) => (
          <FilterCheckbox
            key={section.id}
            checked={selectedSectionIds.includes(section.id)}
            onChange={() => onToggleSection(section.id)}
            label={section.nome}
            imageUrl={section.immagine_url}
          />
        ))}
        {sections.length === 0 && (
          <p className="text-sm text-gray-400 px-2 py-2">Nessuna sezione disponibile</p>
        )}
      </FilterGroup>

      <FilterGroup title="Tipo prodotto">
        {Object.entries(TIPO_PRODOTTO).map(([key, label]) => (
          <FilterCheckbox
            key={key}
            checked={selectedTipi.includes(key)}
            onChange={() => onToggleTipo(key)}
            label={label}
          />
        ))}
      </FilterGroup>
    </div>
  )
}

export function CatalogSidebar({
  brands = [],
  sections = [],
  selectedBrandIds = [],
  selectedSectionIds = [],
  selectedTipi = [],
  onToggleBrand,
  onToggleSection,
  onToggleTipo,
  open,
  onClose,
}) {
  return (
    <>
      {/* Desktop: static sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="px-4 pt-5 pb-2">
          <p className="text-base font-semibold text-gray-800">Filtri</p>
        </div>
        <SidebarContent
          brands={brands}
          sections={sections}
          selectedBrandIds={selectedBrandIds}
          selectedSectionIds={selectedSectionIds}
          selectedTipi={selectedTipi}
          onToggleBrand={onToggleBrand}
          onToggleSection={onToggleSection}
          onToggleTipo={onToggleTipo}
        />
      </aside>

      {/* Mobile: drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div className="relative z-50 flex flex-col w-72 bg-white h-full shadow-xl">
            <div className="flex items-center justify-between px-4 pt-5 pb-2 border-b border-gray-100">
              <p className="text-base font-semibold text-gray-800">Filtri</p>
              <button
                onClick={onClose}
                aria-label="Chiudi filtri"
                className="flex items-center justify-center min-h-[48px] min-w-[48px] rounded-lg text-gray-500 hover:bg-gray-100 focus:ring-2 focus:ring-mikai-400 focus:outline-none"
              >
                <Icon icon={ACTION_ICONS.close} size={20} />
              </button>
            </div>
            <SidebarContent
              brands={brands}
              sections={sections}
              selectedBrandIds={selectedBrandIds}
              selectedSectionIds={selectedSectionIds}
              selectedTipi={selectedTipi}
              onToggleBrand={onToggleBrand}
              onToggleSection={onToggleSection}
              onToggleTipo={onToggleTipo}
            />
          </div>
        </div>
      )}
    </>
  )
}
