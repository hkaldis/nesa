/* Reference data: categories, connection interfaces, capabilities, standard
   size series, core-kit checklists and job templates.

   Everything here is a *default*. The app merges user overrides from settings,
   so nothing is hard-wired to my opinion of what a workshop should contain. */
(function (App) {
  'use strict';

  /* ---------------------------------------------------------------- categories */
  // parent -> children. `accessory: true` means the item normally plugs into
  // something else, which is what the orphan checks in gaps.js key off.
  const CATEGORIES = [
    { id: 'drilling', name: 'Drilling & Driving', children: [
      { id: 'drill-driver', name: 'Drill / Driver' },
      { id: 'impact-driver', name: 'Impact Driver' },
      { id: 'hammer-drill', name: 'Hammer Drill' },
      { id: 'rotary-hammer', name: 'Rotary Hammer (SDS)' },
      { id: 'drill-press', name: 'Drill Press' },
      { id: 'drill-bit', name: 'Drill Bit', accessory: true },
      { id: 'driver-bit', name: 'Driver Bit', accessory: true },
      { id: 'hole-saw', name: 'Hole Saw', accessory: true },
      { id: 'drill-guide', name: 'Drill Guide / Depth Stop', accessory: true },
      { id: 'bit-holder', name: 'Bit Holder', accessory: true, adapter: true },
      { id: 'angle-adapter', name: 'Right-Angle / Offset Adapter', accessory: true, adapter: true }
    ] },
    { id: 'fastening', name: 'Fastening & Torque', children: [
      { id: 'ratchet', name: 'Ratchet' },
      { id: 'socket', name: 'Socket', accessory: true },
      { id: 'torque-wrench', name: 'Torque Wrench' },
      { id: 'impact-wrench', name: 'Impact Wrench' },
      { id: 'wrench', name: 'Spanner / Wrench' },
      { id: 'screwdriver', name: 'Screwdriver' },
      { id: 'hex-key', name: 'Hex / Allen Key', accessory: true },
      { id: 'torx-key', name: 'Torx Key', accessory: true },
      { id: 'extension-bar', name: 'Extension Bar', accessory: true },
      { id: 'drive-adapter', name: 'Drive Adapter', accessory: true, adapter: true }
    ] },
    { id: 'cutting', name: 'Cutting', children: [
      { id: 'circular-saw', name: 'Circular Saw' },
      { id: 'jigsaw', name: 'Jigsaw' },
      { id: 'reciprocating-saw', name: 'Reciprocating Saw' },
      { id: 'mitre-saw', name: 'Mitre Saw' },
      { id: 'table-saw', name: 'Table Saw' },
      { id: 'handsaw', name: 'Handsaw' },
      { id: 'angle-grinder', name: 'Angle Grinder' },
      { id: 'multi-tool', name: 'Oscillating Multi-Tool' },
      { id: 'knife', name: 'Knife / Cutter' },
      { id: 'saw-blade', name: 'Saw Blade', accessory: true },
      { id: 'grinder-disc', name: 'Grinding / Cutting Disc', accessory: true }
    ] },
    { id: 'shaping', name: 'Shaping & Finishing', children: [
      { id: 'router', name: 'Router' },
      { id: 'router-bit', name: 'Router Bit', accessory: true },
      { id: 'sander', name: 'Sander' },
      { id: 'planer', name: 'Planer' },
      { id: 'chisel', name: 'Chisel' },
      { id: 'file', name: 'File / Rasp' },
      { id: 'abrasive', name: 'Abrasive / Sandpaper', accessory: true }
    ] },
    { id: 'measuring', name: 'Measuring & Marking', children: [
      { id: 'tape-measure', name: 'Tape Measure' },
      { id: 'ruler-square', name: 'Rule / Square' },
      { id: 'level', name: 'Spirit / Laser Level' },
      { id: 'caliper', name: 'Caliper / Micrometer' },
      { id: 'multimeter', name: 'Multimeter' },
      { id: 'clamp-meter', name: 'Clamp Meter' },
      { id: 'detector', name: 'Stud / Cable Detector' },
      { id: 'marking', name: 'Marking Tool' }
    ] },
    { id: 'power', name: 'Power & Air', children: [
      { id: 'battery', name: 'Battery', accessory: true },
      { id: 'charger', name: 'Charger', accessory: true },
      { id: 'compressor', name: 'Air Compressor' },
      { id: 'air-tool', name: 'Air Tool' },
      { id: 'extension-lead', name: 'Extension Lead' },
      { id: 'generator', name: 'Generator' },
      { id: 'transformer', name: 'Transformer / Inverter' }
    ] },
    { id: 'holding', name: 'Holding & Lifting', children: [
      { id: 'clamp', name: 'Clamp' },
      { id: 'vice', name: 'Vice' },
      { id: 'workbench', name: 'Workbench / Trestle' },
      { id: 'pliers', name: 'Pliers / Grips' },
      { id: 'jack', name: 'Jack' },
      { id: 'axle-stand', name: 'Axle Stand' },
      { id: 'ladder', name: 'Ladder / Steps' }
    ] },
    { id: 'striking', name: 'Striking & Demolition', children: [
      { id: 'hammer', name: 'Hammer' },
      { id: 'mallet', name: 'Mallet' },
      { id: 'punch-chisel', name: 'Punch / Cold Chisel' },
      { id: 'pry-bar', name: 'Pry Bar' },
      { id: 'breaker', name: 'Breaker' }
    ] },
    { id: 'trades', name: 'Trade Specific', children: [
      { id: 'plumbing', name: 'Plumbing Tool' },
      { id: 'electrical', name: 'Electrical Tool' },
      { id: 'welding', name: 'Welding / Soldering' },
      { id: 'painting', name: 'Painting & Decorating' },
      { id: 'tiling', name: 'Tiling' },
      { id: 'plastering', name: 'Plastering' },
      { id: 'garden', name: 'Garden & Outdoor' },
      { id: 'automotive', name: 'Automotive Specialist' },
      { id: 'bicycle', name: 'Bicycle' },
      { id: 'caulk-gun', name: 'Sealant / Caulking Gun' },
      { id: 'pressure-washer', name: 'Pressure Washer' }
    ] },
    { id: 'site', name: 'Site & Safety', children: [
      { id: 'ppe', name: 'PPE' },
      { id: 'lighting', name: 'Work Light' },
      { id: 'vacuum', name: 'Vacuum / Dust Extraction' },
      { id: 'storage', name: 'Storage / Tool Box' },
      { id: 'consumable', name: 'Consumable', accessory: true },
      { id: 'other', name: 'Other' }
    ] },
    { id: 'outdoor', name: 'Outdoor & Camping', children: [
      { id: 'axe', name: 'Axe / Hatchet' },
      { id: 'shovel', name: 'Spade / Shovel' },
      { id: 'flashlight', name: 'Torch / Flashlight' },
      { id: 'camp-tool', name: 'Camping Tool' }
    ] }
  ];

  /* --------------------------------------------------------------- interfaces */
  /* A connection is a namespaced token, e.g. `battery:dewalt-20v`, `drive:1/2`.
     A tool `accepts` tokens (it is the host) and `fits` tokens (it is the
     accessory). Compatibility is simply: A.accepts intersects B.fits. */
  const INTERFACE_GROUPS = [
    { id: 'battery', name: 'Battery platform', hostLabel: 'Runs on', fitLabel: 'Powers', values: [
      { id: 'dewalt-12v', name: 'DeWalt 12V XR' },
      { id: 'dewalt-18v-xr', name: 'DeWalt 18V XR' },
      { id: 'dewalt-20v-max', name: 'DeWalt 20V MAX' },
      { id: 'dewalt-54v-flexvolt', name: 'DeWalt 54V FlexVolt' },
      { id: 'makita-cxt-12v', name: 'Makita CXT 12V' },
      { id: 'makita-lxt-18v', name: 'Makita LXT 18V' },
      { id: 'makita-xgt-40v', name: 'Makita XGT 40V' },
      { id: 'milwaukee-m12', name: 'Milwaukee M12' },
      { id: 'milwaukee-m18', name: 'Milwaukee M18' },
      { id: 'bosch-pro-12v', name: 'Bosch Professional 12V' },
      { id: 'bosch-pro-18v', name: 'Bosch Professional 18V' },
      { id: 'bosch-home-18v', name: 'Bosch Home & Garden 18V' },
      { id: 'ryobi-one-plus', name: 'Ryobi ONE+ 18V' },
      { id: 'einhell-power-x', name: 'Einhell Power X-Change 18V' },
      { id: 'parkside-x20v', name: 'Parkside X20V Team' },
      { id: 'festool-18v', name: 'Festool 18V' },
      { id: 'metabo-18v', name: 'Metabo 18V LiHD' },
      { id: 'hikoki-18v', name: 'HiKOKI / Hitachi 18V' },
      { id: 'aeg-18v', name: 'AEG 18V' },
      { id: 'worx-20v', name: 'Worx PowerShare 20V' },
      { id: 'stihl-ak', name: 'Stihl AK / AP' },
      { id: 'ego-56v', name: 'EGO Power+ 56V' }
    ] },
    { id: 'drive', name: 'Square drive', hostLabel: 'Drive size', fitLabel: 'Fits drive', values: [
      { id: '1/4', name: '1/4" drive' },
      { id: '3/8', name: '3/8" drive' },
      { id: '1/2', name: '1/2" drive' },
      { id: '3/4', name: '3/4" drive' },
      { id: '1', name: '1" drive' }
    ] },
    { id: 'shank', name: 'Bit shank', hostLabel: 'Takes shank', fitLabel: 'Shank', values: [
      { id: 'hex-1/4', name: '1/4" hex (quick change)' },
      { id: 'hex-5/16', name: '5/16" hex' },
      { id: 'round', name: 'Round shank' },
      { id: 'sds-plus', name: 'SDS-Plus' },
      { id: 'sds-max', name: 'SDS-Max' },
      { id: 'sds-top', name: 'SDS-Top' },
      { id: 'reduced-round', name: 'Reduced round shank' }
    ] },
    { id: 'chuck', name: 'Chuck capacity', hostLabel: 'Chuck', fitLabel: 'Needs chuck', values: [
      { id: '10mm', name: '10 mm keyless' },
      { id: '13mm', name: '13 mm keyless' },
      { id: '13mm-keyed', name: '13 mm keyed' },
      { id: '16mm', name: '16 mm' }
    ] },
    { id: 'spindle', name: 'Grinder spindle', hostLabel: 'Spindle', fitLabel: 'Spindle', values: [
      { id: 'm14', name: 'M14' },
      { id: 'm10', name: 'M10' },
      { id: '5/8-11', name: '5/8"-11 UNC' }
    ] },
    { id: 'disc', name: 'Disc size', hostLabel: 'Takes disc', fitLabel: 'Disc size', values: [
      { id: '76mm', name: '76 mm (3")' },
      { id: '115mm', name: '115 mm (4.5")' },
      { id: '125mm', name: '125 mm (5")' },
      { id: '180mm', name: '180 mm (7")' },
      { id: '230mm', name: '230 mm (9")' }
    ] },
    { id: 'sawblade', name: 'Saw blade mount', hostLabel: 'Takes blade', fitLabel: 'Blade type', values: [
      { id: 'jigsaw-t', name: 'Jigsaw T-shank' },
      { id: 'jigsaw-u', name: 'Jigsaw U-shank' },
      { id: 'recip', name: 'Reciprocating (universal)' },
      { id: 'circ-16mm', name: 'Circular, 16 mm bore' },
      { id: 'circ-20mm', name: 'Circular, 20 mm bore' },
      { id: 'circ-25.4mm', name: 'Circular, 25.4 mm bore' },
      { id: 'circ-30mm', name: 'Circular, 30 mm bore' }
    ] },
    { id: 'oscillating', name: 'Oscillating mount', hostLabel: 'Takes blade', fitLabel: 'Mount', values: [
      { id: 'starlock', name: 'Starlock' },
      { id: 'starlock-plus', name: 'StarlockPlus' },
      { id: 'starlock-max', name: 'StarlockMax' },
      { id: 'ois', name: 'OIS / universal' }
    ] },
    { id: 'collet', name: 'Router collet', hostLabel: 'Collet', fitLabel: 'Shank', values: [
      { id: '1/4', name: '1/4"' },
      { id: '8mm', name: '8 mm' },
      { id: '3/8', name: '3/8"' },
      { id: '1/2', name: '1/2"' },
      { id: '6mm', name: '6 mm' }
    ] },
    { id: 'mains', name: 'Mains supply', hostLabel: 'Runs on', fitLabel: 'Supplies', values: [
      { id: '230v', name: '230 V' },
      { id: '110v', name: '110 V site' },
      { id: '120v', name: '120 V' }
    ] },
    { id: 'air', name: 'Air fitting', hostLabel: 'Air inlet', fitLabel: 'Air outlet', values: [
      { id: '1/4-bsp', name: '1/4" BSP' },
      { id: '1/4-npt', name: '1/4" NPT' },
      { id: '3/8-bsp', name: '3/8" BSP' },
      { id: 'euro', name: 'Euro quick coupler' },
      { id: 'pcl', name: 'PCL quick coupler' }
    ] },
    { id: 'dust', name: 'Dust port', hostLabel: 'Dust port', fitLabel: 'Hose size', values: [
      { id: '27mm', name: '27 mm' },
      { id: '32mm', name: '32 mm' },
      { id: '35mm', name: '35 mm' },
      { id: '38mm', name: '38 mm' }
    ] }
  ];

  /* -------------------------------------------------------------- capabilities */
  /* What a tool lets you *do*. Job templates are written against these, so the
     job planner keeps working when you buy a different brand of the same thing. */
  const CAPABILITIES = [
    { id: 'drill-wood', name: 'Drill wood' },
    { id: 'drill-metal', name: 'Drill metal' },
    { id: 'drill-masonry', name: 'Drill masonry' },
    { id: 'drill-large-hole', name: 'Cut large holes' },
    { id: 'drive-screws', name: 'Drive screws' },
    { id: 'drive-high-torque', name: 'High-torque fastening' },
    { id: 'torque-to-spec', name: 'Torque to spec' },
    { id: 'undo-seized', name: 'Undo seized fasteners' },
    { id: 'cut-wood-straight', name: 'Straight cuts in wood' },
    { id: 'cut-wood-curve', name: 'Curved cuts in wood' },
    { id: 'cut-metal', name: 'Cut metal' },
    { id: 'cut-masonry', name: 'Cut masonry / tile' },
    { id: 'cut-pipe', name: 'Cut pipe' },
    { id: 'demolition', name: 'Demolition' },
    { id: 'sand-smooth', name: 'Sand / smooth' },
    { id: 'shape-edge', name: 'Shape edges' },
    { id: 'plane-flat', name: 'Plane flat' },
    { id: 'chisel-wood', name: 'Chisel wood' },
    { id: 'measure-length', name: 'Measure length' },
    { id: 'measure-level', name: 'Check level / plumb' },
    { id: 'measure-square', name: 'Check square' },
    { id: 'measure-precise', name: 'Precision measurement' },
    { id: 'measure-electrical', name: 'Measure electrical' },
    { id: 'detect-hidden', name: 'Detect hidden services' },
    { id: 'clamp-hold', name: 'Clamp / hold work' },
    { id: 'lift-support', name: 'Lift & support loads' },
    { id: 'grip-turn', name: 'Grip & turn' },
    { id: 'strike', name: 'Strike' },
    { id: 'pry', name: 'Pry / lever' },
    { id: 'cut-wire', name: 'Cut & strip wire' },
    { id: 'solder-join', name: 'Solder / weld' },
    { id: 'seal-apply', name: 'Apply sealant / adhesive' },
    { id: 'paint-apply', name: 'Apply paint' },
    { id: 'extract-dust', name: 'Extract dust' },
    { id: 'light-work', name: 'Light the work area' },
    { id: 'protect-self', name: 'Personal protection' },
    { id: 'work-at-height', name: 'Work at height' },
    { id: 'mix-material', name: 'Mix material' },
    { id: 'heat-material', name: 'Heat / strip' },
    { id: 'dig-earth', name: 'Dig' },
    { id: 'chop-split', name: 'Chop & split wood' },
    { id: 'carve', name: 'Carve / whittle' },
    { id: 'wash-clean', name: 'Pressure wash' }
  ];

  /* Sensible capability defaults per category, applied when you add a tool so
     the job planner is useful immediately without hand-tagging everything. */
  const CATEGORY_CAPABILITIES = {
    'drill-driver': ['drill-wood', 'drill-metal', 'drive-screws'],
    'impact-driver': ['drive-screws', 'drive-high-torque'],
    'hammer-drill': ['drill-wood', 'drill-metal', 'drill-masonry', 'drive-screws'],
    'rotary-hammer': ['drill-masonry', 'demolition'],
    'drill-press': ['drill-wood', 'drill-metal'],
    'hole-saw': ['drill-large-hole'],
    ratchet: ['drive-screws', 'grip-turn'],
    'torque-wrench': ['torque-to-spec'],
    'impact-wrench': ['drive-high-torque', 'undo-seized'],
    wrench: ['grip-turn'],
    screwdriver: ['drive-screws'],
    'hex-key': ['drive-screws'],
    'torx-key': ['drive-screws'],
    'circular-saw': ['cut-wood-straight'],
    jigsaw: ['cut-wood-curve', 'cut-wood-straight'],
    'reciprocating-saw': ['demolition', 'cut-wood-straight', 'cut-metal'],
    'mitre-saw': ['cut-wood-straight'],
    'table-saw': ['cut-wood-straight'],
    handsaw: ['cut-wood-straight'],
    'angle-grinder': ['cut-metal', 'cut-masonry', 'sand-smooth'],
    'multi-tool': ['cut-wood-curve', 'sand-smooth'],
    knife: ['cut-wood-curve'],
    router: ['shape-edge'],
    sander: ['sand-smooth'],
    planer: ['plane-flat'],
    chisel: ['chisel-wood'],
    file: ['sand-smooth'],
    'tape-measure': ['measure-length'],
    'ruler-square': ['measure-length', 'measure-square'],
    level: ['measure-level'],
    caliper: ['measure-precise'],
    multimeter: ['measure-electrical'],
    detector: ['detect-hidden'],
    clamp: ['clamp-hold'],
    vice: ['clamp-hold'],
    pliers: ['grip-turn'],
    jack: ['lift-support'],
    'axle-stand': ['lift-support'],
    ladder: ['work-at-height'],
    hammer: ['strike'],
    mallet: ['strike'],
    'punch-chisel': ['strike'],
    'pry-bar': ['pry'],
    breaker: ['demolition'],
    plumbing: ['cut-pipe', 'grip-turn'],
    electrical: ['cut-wire'],
    welding: ['solder-join'],
    painting: ['paint-apply'],
    garden: ['cut-wood-curve'],
    ppe: ['protect-self'],
    lighting: ['light-work'],
    vacuum: ['extract-dust'],
    axe: ['chop-split', 'strike'],
    shovel: ['dig-earth'],
    flashlight: ['light-work'],
    'clamp-meter': ['measure-electrical'],
    'caulk-gun': ['seal-apply'],
    'pressure-washer': ['wash-clean'],
    'camp-tool': []
  };

  /* ------------------------------------------------------------ size series */
  /* Used by the gap finder to spot holes in a set (the missing 15 mm socket). */
  const STANDARD_SERIES = [
    { id: 'socket-metric', category: 'socket', system: 'metric', name: 'Metric sockets',
      sizes: [4, 4.5, 5, 5.5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 27, 30, 32],
      common: [8, 10, 12, 13, 14, 17, 19] },
    { id: 'socket-imperial', category: 'socket', system: 'imperial', name: 'Imperial sockets',
      sizes: [0.25, 0.3125, 0.375, 0.4375, 0.5, 0.5625, 0.625, 0.6875, 0.75, 0.8125, 0.875, 0.9375, 1],
      common: [0.375, 0.4375, 0.5, 0.5625, 0.625] },
    { id: 'wrench-metric', category: 'wrench', system: 'metric', name: 'Metric spanners',
      sizes: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24],
      common: [8, 10, 12, 13, 14, 17, 19] },
    { id: 'wrench-imperial', category: 'wrench', system: 'imperial', name: 'Imperial spanners',
      sizes: [0.25, 0.3125, 0.375, 0.4375, 0.5, 0.5625, 0.625, 0.6875, 0.75, 0.8125, 0.875, 0.9375, 1],
      common: [0.375, 0.5, 0.5625, 0.625] },
    { id: 'hex-metric', category: 'hex-key', system: 'metric', name: 'Metric hex keys',
      sizes: [1.5, 2, 2.5, 3, 4, 5, 6, 8, 10], common: [3, 4, 5, 6] },
    { id: 'hex-imperial', category: 'hex-key', system: 'imperial', name: 'Imperial hex keys',
      sizes: [0.0625, 0.078125, 0.09375, 0.125, 0.15625, 0.1875, 0.25, 0.3125, 0.375], common: [0.125, 0.1875, 0.25] },
    { id: 'torx', category: 'torx-key', system: 'torx', name: 'Torx keys',
      sizes: [10, 15, 20, 25, 27, 30, 40, 45, 50], common: [20, 25, 30] },
    { id: 'twist-metric', category: 'drill-bit', system: 'metric', name: 'Twist drill bits',
      sizes: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 8, 9, 10],
      common: [2, 3, 4, 5, 6, 8] }
  ];

  /* ------------------------------------------------------------- core kits */
  /* Checklists to measure your inventory against. Each entry is a capability or
     category you would expect to own for that kind of work. */
  const CORE_KITS = [
    { id: 'household', name: 'Household basics', items: [
      { label: 'Claw hammer', category: 'hammer' },
      { label: 'Screwdriver set', category: 'screwdriver' },
      { label: 'Cordless drill/driver', capability: 'drill-wood' },
      { label: 'Tape measure', category: 'tape-measure' },
      { label: 'Spirit level', category: 'level' },
      { label: 'Adjustable pliers', category: 'pliers' },
      { label: 'Utility knife', category: 'knife' },
      { label: 'Handsaw', category: 'handsaw' },
      { label: 'Hex key set', category: 'hex-key' },
      { label: 'Stud / cable detector', category: 'detector' },
      { label: 'Safety glasses', category: 'ppe' },
      { label: 'Step ladder', category: 'ladder' }
    ] },
    { id: 'woodworking', name: 'Woodworking', items: [
      { label: 'Circular or track saw', capability: 'cut-wood-straight' },
      { label: 'Jigsaw', capability: 'cut-wood-curve' },
      { label: 'Random orbit sander', capability: 'sand-smooth' },
      { label: 'Router', category: 'router' },
      { label: 'Chisel set', category: 'chisel' },
      { label: 'Clamps', category: 'clamp' },
      { label: 'Combination square', category: 'ruler-square' },
      { label: 'Workbench or trestles', category: 'workbench' },
      { label: 'Dust extraction', capability: 'extract-dust' },
      { label: 'Mitre saw', category: 'mitre-saw' }
    ] },
    { id: 'automotive', name: 'Automotive', items: [
      { label: 'Socket set', category: 'socket' },
      { label: 'Ratchet', category: 'ratchet' },
      { label: 'Torque wrench', category: 'torque-wrench' },
      { label: 'Trolley jack', category: 'jack' },
      { label: 'Axle stands', category: 'axle-stand' },
      { label: 'Combination spanners', category: 'wrench' },
      { label: 'Breaker bar or impact wrench', capability: 'undo-seized' },
      { label: 'Multimeter', category: 'multimeter' },
      { label: 'Work light', category: 'lighting' },
      { label: 'Oil drain / catch pan', category: 'automotive' }
    ] },
    { id: 'electrical', name: 'Electrical', items: [
      { label: 'Multimeter', category: 'multimeter' },
      { label: 'Voltage tester', category: 'electrical' },
      { label: 'Wire strippers', capability: 'cut-wire' },
      { label: 'Insulated screwdrivers', category: 'screwdriver' },
      { label: 'Cable detector', category: 'detector' },
      { label: 'Side cutters', category: 'pliers' }
    ] },
    { id: 'plumbing', name: 'Plumbing', items: [
      { label: 'Pipe cutter', capability: 'cut-pipe' },
      { label: 'Adjustable wrench', category: 'wrench' },
      { label: 'Water pump pliers', category: 'pliers' },
      { label: 'Blow torch / soldering', capability: 'solder-join' },
      { label: 'PTFE / sealant', capability: 'seal-apply' },
      { label: 'Basin wrench', category: 'plumbing' }
    ] },
    { id: 'decorating', name: 'Decorating', items: [
      { label: 'Filling knife', category: 'plastering' },
      { label: 'Brushes & rollers', category: 'painting' },
      { label: 'Sander', capability: 'sand-smooth' },
      { label: 'Caulking gun', capability: 'seal-apply' },
      { label: 'Dust sheets', category: 'consumable' },
      { label: 'Heat gun / stripper', capability: 'heat-material' }
    ] },
    { id: 'bushcraft', name: 'Outdoor & bushcraft', items: [
      { label: 'Axe or hatchet', capability: 'chop-split' },
      { label: 'Fixed-blade knife', category: 'knife' },
      { label: 'Folding spade', capability: 'dig-earth' },
      { label: 'Head torch or flashlight', capability: 'light-work' },
      { label: 'Folding saw', capability: 'cut-wood-straight' },
      { label: 'Sharpening stone', category: 'abrasive' },
      { label: 'First aid kit', category: 'ppe' }
    ] },
    { id: 'garden', name: 'Garden & outdoor', items: [
      { label: 'Secateurs / loppers', category: 'garden' },
      { label: 'Spade / fork', category: 'garden' },
      { label: 'Hedge trimmer', category: 'garden' },
      { label: 'Lawn mower', category: 'garden' },
      { label: 'Wheelbarrow', category: 'garden' },
      { label: 'Outdoor extension lead', category: 'extension-lead' }
    ] }
  ];

  /* --------------------------------------------------------------- job templates */
  /* A requirement matches on capability, category, or a specific size, and can
     be marked optional. `size` is checked against the parsed size of your tools. */
  const JOB_TEMPLATES = [
    { id: 'flatpack', name: 'Assemble flat-pack furniture', kit: 'household', minutes: 90, requires: [
      { label: 'Cordless drill or driver', capability: 'drive-screws' },
      { label: 'Hex keys (metric)', category: 'hex-key' },
      { label: 'Phillips / Pozi screwdriver', category: 'screwdriver' },
      { label: 'Tape measure', capability: 'measure-length' },
      { label: 'Mallet', category: 'mallet', optional: true },
      { label: 'Spirit level', capability: 'measure-level', optional: true }
    ] },
    { id: 'hang-shelf', name: 'Hang a shelf on masonry', kit: 'household', minutes: 45, requires: [
      { label: 'Hammer drill', capability: 'drill-masonry' },
      { label: 'Masonry drill bit', category: 'drill-bit' },
      { label: 'Cable / pipe detector', capability: 'detect-hidden' },
      { label: 'Spirit level', capability: 'measure-level' },
      { label: 'Tape measure', capability: 'measure-length' },
      { label: 'Screwdriver or driver', capability: 'drive-screws' },
      { label: 'Dust mask & glasses', capability: 'protect-self' }
    ] },
    { id: 'brake-pads', name: 'Change brake pads & discs', kit: 'automotive', minutes: 180, requires: [
      { label: 'Trolley jack', capability: 'lift-support' },
      { label: 'Axle stands', category: 'axle-stand' },
      { label: '19 mm socket (wheel nuts)', category: 'socket', size: { system: 'metric', value: 19 } },
      { label: 'Torque wrench', capability: 'torque-to-spec' },
      { label: 'Breaker bar or impact wrench', capability: 'undo-seized' },
      { label: 'Caliper piston tool', category: 'automotive' },
      { label: 'Wire brush', category: 'automotive', optional: true },
      { label: 'Safety glasses', capability: 'protect-self' }
    ] },
    { id: 'oil-change', name: 'Engine oil & filter change', kit: 'automotive', minutes: 60, requires: [
      { label: 'Ramps or jack & stands', capability: 'lift-support' },
      { label: 'Sump plug socket / hex', capability: 'grip-turn' },
      { label: 'Oil filter wrench', category: 'automotive' },
      { label: 'Drain pan', category: 'automotive' },
      { label: 'Torque wrench', capability: 'torque-to-spec', optional: true },
      { label: 'Funnel', category: 'consumable', optional: true }
    ] },
    { id: 'wheel-swap', name: 'Swap a wheel', kit: 'automotive', minutes: 25, requires: [
      { label: 'Jack', capability: 'lift-support' },
      { label: 'Wheel-nut socket', category: 'socket' },
      { label: 'Breaker bar or wrench', capability: 'grip-turn' },
      { label: 'Torque wrench', capability: 'torque-to-spec' }
    ] },
    { id: 'build-deck', name: 'Build a deck or frame', kit: 'woodworking', minutes: 900, requires: [
      { label: 'Circular or mitre saw', capability: 'cut-wood-straight' },
      { label: 'Impact driver', capability: 'drive-high-torque' },
      { label: 'Drill for pilot holes', capability: 'drill-wood' },
      { label: 'Spirit level', capability: 'measure-level' },
      { label: 'Square', capability: 'measure-square' },
      { label: 'Clamps', capability: 'clamp-hold' },
      { label: 'Tape measure', capability: 'measure-length' },
      { label: 'Ear & eye protection', capability: 'protect-self' }
    ] },
    { id: 'fit-kitchen-unit', name: 'Fit a kitchen unit', kit: 'woodworking', minutes: 240, requires: [
      { label: 'Drill / driver', capability: 'drive-screws' },
      { label: 'Hole saw for pipework', capability: 'drill-large-hole', optional: true },
      { label: 'Jigsaw', capability: 'cut-wood-curve' },
      { label: 'Level', capability: 'measure-level' },
      { label: 'Clamps', capability: 'clamp-hold' },
      { label: 'Detector', capability: 'detect-hidden' }
    ] },
    { id: 'replace-socket', name: 'Replace a mains socket', kit: 'electrical', minutes: 40, requires: [
      { label: 'Voltage tester', capability: 'measure-electrical' },
      { label: 'Insulated screwdrivers', category: 'screwdriver' },
      { label: 'Wire strippers', capability: 'cut-wire' },
      { label: 'Side cutters', category: 'pliers', optional: true }
    ] },
    { id: 'fix-leak', name: 'Fix a leaking pipe joint', kit: 'plumbing', minutes: 60, requires: [
      { label: 'Adjustable wrench', capability: 'grip-turn' },
      { label: 'Pipe cutter', capability: 'cut-pipe' },
      { label: 'PTFE tape / sealant', capability: 'seal-apply' },
      { label: 'Blow torch', capability: 'solder-join', optional: true }
    ] },
    { id: 'tile-splashback', name: 'Tile a splashback', kit: 'household', minutes: 300, requires: [
      { label: 'Tile cutter or grinder', capability: 'cut-masonry' },
      { label: 'Notched trowel', category: 'tiling' },
      { label: 'Spirit level', capability: 'measure-level' },
      { label: 'Mixing paddle or drill', capability: 'mix-material' },
      { label: 'Grout float', category: 'tiling' },
      { label: 'Spacers', category: 'consumable' }
    ] },
    { id: 'paint-room', name: 'Paint a room', kit: 'decorating', minutes: 480, requires: [
      { label: 'Brushes & roller', capability: 'paint-apply' },
      { label: 'Sander or sanding block', capability: 'sand-smooth' },
      { label: 'Filling knife', category: 'plastering' },
      { label: 'Caulking gun', capability: 'seal-apply' },
      { label: 'Step ladder', capability: 'work-at-height' },
      { label: 'Dust sheets', category: 'consumable' }
    ] },
    { id: 'bike-service', name: 'Service a bicycle', kit: 'household', minutes: 120, requires: [
      { label: 'Hex key set', category: 'hex-key' },
      { label: 'Torx keys', category: 'torx-key', optional: true },
      { label: 'Torque wrench (small)', capability: 'torque-to-spec', optional: true },
      { label: 'Chain tool', category: 'bicycle' },
      { label: 'Track pump', category: 'bicycle' }
    ] },
    { id: 'demolish-wall', name: 'Remove a stud wall', kit: 'household', minutes: 360, requires: [
      { label: 'Reciprocating saw or breaker', capability: 'demolition' },
      { label: 'Pry bar', capability: 'pry' },
      { label: 'Club hammer', capability: 'strike' },
      { label: 'Detector', capability: 'detect-hidden' },
      { label: 'Dust extraction or vacuum', capability: 'extract-dust' },
      { label: 'Full PPE', capability: 'protect-self' }
    ] },
    { id: 'hedge-trim', name: 'Trim hedges & tidy garden', kit: 'garden', minutes: 180, requires: [
      { label: 'Hedge trimmer', category: 'garden' },
      { label: 'Loppers or secateurs', category: 'garden' },
      { label: 'Ladder', capability: 'work-at-height', optional: true },
      { label: 'Eye protection', capability: 'protect-self' }
    ] }
  ];

  const CONDITIONS = ['new', 'good', 'worn', 'needs repair', 'broken'];
  const STATUSES = ['owned', 'wishlist', 'lent out', 'sold', 'lost'];
  const POWER_SOURCES = ['manual', 'cordless', 'built-in battery', 'corded', 'pneumatic', 'petrol', 'hydraulic'];

  App.taxonomy = {
    CATEGORIES: CATEGORIES,
    INTERFACE_GROUPS: INTERFACE_GROUPS,
    CAPABILITIES: CAPABILITIES,
    CATEGORY_CAPABILITIES: CATEGORY_CAPABILITIES,
    STANDARD_SERIES: STANDARD_SERIES,
    CORE_KITS: CORE_KITS,
    JOB_TEMPLATES: JOB_TEMPLATES,
    CONDITIONS: CONDITIONS,
    STATUSES: STATUSES,
    POWER_SOURCES: POWER_SOURCES
  };

  /* -------------------------------------------------------------- lookups */
  const flatCategories = [];
  CATEGORIES.forEach(function (group) {
    group.children.forEach(function (child) {
      flatCategories.push({
        id: child.id,
        name: child.name,
        group: group.id,
        groupName: group.name,
        accessory: !!child.accessory,
        adapter: !!child.adapter
      });
    });
  });

  const byId = function (list) {
    const map = Object.create(null);
    list.forEach(function (item) { map[item.id] = item; });
    return map;
  };

  App.taxonomy.flatCategories = flatCategories;
  App.taxonomy.categoryById = byId(flatCategories);
  App.taxonomy.capabilityById = byId(CAPABILITIES);
  App.taxonomy.interfaceGroupById = byId(INTERFACE_GROUPS);

  App.taxonomy.categoryName = function (id) {
    const cat = App.taxonomy.categoryById[id];
    return cat ? cat.name : (id || 'Uncategorised');
  };

  App.taxonomy.capabilityName = function (id) {
    const cap = App.taxonomy.capabilityById[id];
    return cap ? cap.name : id;
  };

  // `battery:makita-lxt-18v` -> "Makita LXT 18V"
  App.taxonomy.interfaceName = function (token) {
    const parts = String(token || '').split(':');
    const group = App.taxonomy.interfaceGroupById[parts[0]];
    if (!group) return token;
    const value = group.values.filter(function (v) { return v.id === parts[1]; })[0];
    return value ? value.name : token;
  };

  App.taxonomy.interfaceGroupName = function (token) {
    const group = App.taxonomy.interfaceGroupById[String(token || '').split(':')[0]];
    return group ? group.name : 'Connection';
  };
})(window.App = window.App || {});
