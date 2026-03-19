import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { CatalogStepBrand } from './CatalogStepBrand'
import { CatalogStepBodySection } from './CatalogStepBodySection'
import { CatalogStepProducts } from './CatalogStepProducts'
import { MaterialCart } from './MaterialCart'
import { Button } from '../ui/Button'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'

export function MaterialCatalogPicker({ eventId, event, onDone }) {
  const [step, setStep] = useState(0) // 0=brand, 1=section, 2=products
  const [brands, setBrands] = useState([])
  const [sections, setSections] = useState([])
  const [products, setProducts] = useState([])
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBrands = useMaterialsStore(s => s.fetchBrands)
  const fetchBodySections = useMaterialsStore(s => s.fetchBodySections)
  const fetchProductsWithMaterials = useMaterialsStore(s => s.fetchProductsWithMaterials)

  useEffect(() => {
    fetchBrands().then(({ data }) => {
      setBrands(data)
      setLoading(false)
      if (data.length === 1) {
        handleSelectBrand(data[0])
      }
    })
  }, [])

  const handleSelectBrand = async (brand) => {
    setSelectedBrand(brand)
    setLoading(true)
    const { data: secs } = await fetchBodySections(brand.id)
    setSections(secs)
    setLoading(false)
    if (secs.length === 1) {
      handleSelectSection(brand, secs[0])
    } else {
      setStep(1)
    }
  }

  const handleSelectSection = async (brand, section) => {
    const b = brand || selectedBrand
    setSelectedSection(section)
    setLoading(true)
    const { data: prods } = await fetchProductsWithMaterials(b.id, section.id)
    setProducts(prods)
    setLoading(false)
    setStep(2)
  }

  const handleAddToCart = (material) => {
    if (!cart.find(m => m.id === material.id)) {
      setCart([...cart, material])
    }
  }

  const handleRemoveFromCart = (materialId) => {
    setCart(cart.filter(m => m.id !== materialId))
  }

  if (loading && step === 0) return <LoadingSkeleton lines={3} />

  return (
    <div className="bg-gray-50 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Richiedi materiale</h3>
        <Button variant="ghost" onClick={onDone}>Chiudi</Button>
      </div>

      {loading ? (
        <LoadingSkeleton lines={3} />
      ) : (
        <>
          {step === 0 && (
            <CatalogStepBrand brands={brands} onSelect={handleSelectBrand} />
          )}
          {step === 1 && (
            <CatalogStepBodySection
              brandName={selectedBrand.nome}
              sections={sections}
              onSelect={(s) => handleSelectSection(null, s)}
              onBack={() => { setStep(0); setSelectedBrand(null) }}
            />
          )}
          {step === 2 && (
            <>
              <CatalogStepProducts
                brandName={selectedBrand.nome}
                sectionName={selectedSection.nome}
                products={products}
                cart={cart}
                onAdd={handleAddToCart}
                onBack={() => { setStep(1); setSelectedSection(null) }}
              />
              <MaterialCart
                eventId={eventId}
                event={event}
                cart={cart}
                onRemove={handleRemoveFromCart}
                onDone={onDone}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
