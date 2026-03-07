'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Building2,
  ClipboardList,
  Settings,
  Wrench,
} from 'lucide-react';

type PlaceholderItem = {
  id: string;
  label: string;
};

type BrandCategory = {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  brands: PlaceholderItem[];
};

const equipmentTypes: PlaceholderItem[] = [
  { id: 'eq-1', label: 'Equipment listed here' },
  { id: 'eq-2', label: 'Equipment listed here (example)' },
  { id: 'eq-3', label: 'System listed here' },
  { id: 'eq-4', label: 'Fixture listed here' },
  { id: 'eq-5', label: 'Appliance listed here' },
  { id: 'eq-6', label: 'Specialty item listed here' },
];

const brandCategories: BrandCategory[] = [
  {
    id: 'cat-1',
    name: 'Service Category Listed Here',
    icon: Building2,
    brands: [
      { id: 'brand-1', label: 'Brand listed here' },
      { id: 'brand-2', label: 'Brand listed here' },
      { id: 'brand-3', label: 'Brand listed here' },
    ],
  },
  {
    id: 'cat-2',
    name: 'Service Category Listed Here',
    icon: Settings,
    brands: [
      { id: 'brand-4', label: 'Brand listed here' },
      { id: 'brand-5', label: 'Brand listed here' },
      { id: 'brand-6', label: 'Brand listed here' },
    ],
  },
  {
    id: 'cat-3',
    name: 'Service Category Listed Here',
    icon: Wrench,
    brands: [
      { id: 'brand-7', label: 'Brand listed here' },
      { id: 'brand-8', label: 'Brand listed here' },
      { id: 'brand-9', label: 'Brand listed here' },
    ],
  },
];

/**
 * Equipment & Service Capabilities section.
 * This is intentionally generic so each business can replace entries
 * with their own equipment, systems, fixtures, and brands.
 */
export function EquipmentExpertise() {
  const [showEquipment, setShowEquipment] = useState(false);
  const [showBrands, setShowBrands] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-center text-lg font-semibold text-foreground">
        Equipment and service mix
      </h2>
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Shape this around the systems, brands, and repeat issues your technicians actually see in
        the field.
      </p>

      <div className="rounded-lg border bg-card">
        <button
          onClick={() => setShowEquipment(!showEquipment)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="font-medium">Equipment Types</span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {equipmentTypes.length}+ entries
            {showEquipment ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </button>
        {showEquipment && (
          <div className="border-t px-4 pb-4 pt-2">
            <div className="flex flex-wrap gap-2">
              {equipmentTypes.map((item) => (
                <span
                  key={item.id}
                  className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <button
          onClick={() => setShowBrands(!showBrands)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="font-medium">Brands / Lines / Parts You Service</span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {brandCategories.length}+ categories
            {showBrands ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </button>
        {showBrands && (
          <div className="space-y-4 border-t px-4 pb-4 pt-2">
            {brandCategories.map((category) => (
              <div key={category.id}>
                <div className="mb-2 flex items-center gap-2">
                  <category.icon size={16} className="text-accent" />
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {category.brands.map((brand) => (
                    <span
                      key={brand.id}
                      className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {brand.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground/70">
        <ClipboardList size={14} />
        Use this area to reflect the work your crew does every week.
      </p>
    </div>
  );
}
