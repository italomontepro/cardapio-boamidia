'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/menu/format'
import ProductDialog from './product-dialog'

export type ProductRow = {
  id: string
  name: string
  description: string | null
  price: string
  imageUrl: string | null
  isFeatured: boolean
}

type CategoryRow = {
  id: string
  name: string
  products: ProductRow[]
}

function ProductCard({ product, onSelect }: { product: ProductRow; onSelect: (p: ProductRow) => void }) {
  return (
    <Card
      className="w-full cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onSelect(product)}
    >
      <div className="relative h-32 w-full shrink-0 overflow-hidden bg-muted">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Sem foto
          </div>
        )}
      </div>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-sm">{product.name}</span>
          {product.isFeatured && <Badge variant="secondary">Destaque</Badge>}
        </div>
        {product.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        )}
        <span className="text-sm font-semibold">{formatBRL(Number(product.price))}</span>
      </CardContent>
    </Card>
  )
}

export default function MenuView({
  unitName,
  categories,
  featured,
}: {
  unitName: string
  categories: CategoryRow[]
  featured: ProductRow[]
}) {
  const [selected, setSelected] = useState<ProductRow | null>(null)

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* D-05: sticky unit indicator, always visible */}
      <div className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
        <p className="text-sm text-muted-foreground">
          Você está em: <span className="font-medium text-foreground">{unitName}</span>
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {categories.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Cardápio em breve.</p>
        ) : (
          <>
            {/* D-07: Destaques strip, outside Tabs so it stays visible on every tab */}
            {featured.length > 0 && (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold">Destaques</h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {featured.map((p) => (
                    <div key={p.id} className="w-40 shrink-0">
                      <ProductCard product={p} onSelect={setSelected} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* D-06: category Tabs, one product grid per category */}
            <Tabs defaultValue={categories[0]?.id}>
              <TabsList className="w-full overflow-x-auto">
                {categories.map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id}>
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {categories.map((cat) => (
                <TabsContent key={cat.id} value={cat.id}>
                  <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-3">
                    {cat.products.map((p) => (
                      <ProductCard key={p.id} product={p} onSelect={setSelected} />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </div>

      <ProductDialog
        product={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  )
}
