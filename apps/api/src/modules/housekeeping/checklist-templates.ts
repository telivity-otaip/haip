// Default checklists per task type (from KB 5.6)
export const CHECKLIST_TEMPLATES: Record<string, Array<{ item: string; checked: boolean }>> = {
  checkout: [
    { item: 'Strip and remake bed with fresh linens', checked: false },
    { item: 'Replace all towels', checked: false },
    { item: 'Clean bathroom (toilet, shower, sink, mirror)', checked: false },
    { item: 'Vacuum/mop floors', checked: false },
    { item: 'Dust all surfaces', checked: false },
    { item: 'Clean windows and glass', checked: false },
    { item: 'Check and restock amenities (soap, shampoo, etc.)', checked: false },
    { item: 'Check minibar — inventory and restock', checked: false },
    { item: 'Empty trash and replace liners', checked: false },
    { item: 'Check all lights and electronics', checked: false },
    { item: 'Check safe — ensure empty and reset', checked: false },
    { item: 'Check for damage or maintenance issues', checked: false },
    { item: 'Final visual inspection', checked: false },
  ],
  stayover: [
    { item: 'Make bed (or replace linens if requested)', checked: false },
    { item: 'Replace used towels', checked: false },
    { item: 'Clean bathroom surfaces', checked: false },
    { item: 'Empty trash', checked: false },
    { item: 'Vacuum visible areas', checked: false },
    { item: 'Restock amenities as needed', checked: false },
    { item: 'Check minibar — note consumption', checked: false },
  ],
  deep_clean: [
    { item: 'All checkout checklist items', checked: false },
    { item: 'Move furniture and clean behind/under', checked: false },
    { item: 'Deep clean carpet/upholstery', checked: false },
    { item: 'Clean AC vents and filters', checked: false },
    { item: 'Wash curtains/drapes', checked: false },
    { item: 'Sanitize high-touch surfaces', checked: false },
    { item: 'Check mattress condition', checked: false },
    { item: 'Inspect for wear and tear', checked: false },
  ],
  turndown: [
    { item: 'Turn down bed', checked: false },
    { item: 'Close curtains', checked: false },
    { item: 'Set bedside lighting', checked: false },
    { item: 'Place water and amenity on nightstand', checked: false },
    { item: 'Tidy bathroom and replace used towels', checked: false },
    { item: 'Empty trash if needed', checked: false },
  ],
  inspection: [
    { item: 'Bed properly made, no wrinkles', checked: false },
    { item: 'Bathroom spotless, no water marks', checked: false },
    { item: 'All amenities stocked', checked: false },
    { item: 'No dust on surfaces', checked: false },
    { item: 'Floors clean', checked: false },
    { item: 'All lights functional', checked: false },
    { item: 'Temperature comfortable', checked: false },
    { item: 'No odors', checked: false },
    { item: 'Safe empty and reset', checked: false },
  ],
  maintenance: [
    { item: 'Identify issue', checked: false },
    { item: 'Repair or replace', checked: false },
    { item: 'Test functionality', checked: false },
    { item: 'Clean work area', checked: false },
    { item: 'Update maintenance log', checked: false },
  ],
};

// ADA rooms get extra items (KB 5.6: "ADA rooms: extra inspection points")
export const ADA_EXTRA_ITEMS = [
  { item: 'Grab bars secure and clean', checked: false },
  { item: 'Roll-in shower accessible', checked: false },
  { item: 'Lowered amenities within reach', checked: false },
  { item: 'Emergency pull cord functional', checked: false },
  { item: 'Clear floor path (36" minimum)', checked: false },
];

// VIP rooms get premium items (KB 5.6: "VIP rooms: premium linens, branded toiletries")
export const VIP_EXTRA_ITEMS = [
  { item: 'Premium linens placed', checked: false },
  { item: 'Branded toiletries set', checked: false },
  { item: 'Welcome amenity placed', checked: false },
  { item: 'Extra pillows and blankets', checked: false },
];
