# Analytics Dashboard - Development Roadmap

## Project Overview

A comprehensive, config-based analytics dashboard for tracking feature events (Price Alert, Auto-Coupon, Spend-Lens) with real-time data visualization, multi-select filtering, and admin-controlled dashboard configurations.

---

## ✅ Completed Features

### Phase 1: Core Infrastructure

#### API Integration
- [x] **Real API Integration** - Connected to live backend APIs
  - `/api/graph` - POST request for time-series graph data
  - `/api/pieChart` - POST request for distribution pie charts
  - `/api/eventsList?feature=PA|AC|SPEND` - GET request for feature-specific events
  - `siteDetails` API - External API for POS (Point of Sale) options
  
- [x] **Numeric ID System** - All filters use numeric IDs matching backend expectations
  - Platforms: 0-8 (Chrome Extension, Android, iOS, Mobile Ext, Edge, Safari, Firefox, Mail, Graph)
  - Sources: 1=Spidy, 2=Kafka, 3=Self, 8=Graph
  - POS: Dynamic from siteDetails API (2=Flipkart, 63=Amazon, etc.)
  - Events: Dynamic per feature from eventsList API

- [x] **isHourly Response Handling** - Proper processing of both hourly and daily aggregated data
  - ≤7 days: `isHourly: true` returns hourly granularity
  - >7 days: `isHourly: false` returns daily aggregated data

### Phase 2: Multi-Select Filtering

- [x] **MultiSelectDropdown Component** - Generic reusable component
  - Supports both `string` and `number` value types
  - Checkbox-based selection with visual feedback
  - "Select All" option support
  - Badge display for multiple selections
  - Truncation with "+N more" indicator

- [x] **Filter State Management**
  - All filters send arrays to API: `[1, 2, 3]` format
  - Proper defaults: Chrome Extension (0), Flipkart (2), Spidy (1), first event
  - Removed "all" as default - now uses specific selections

### Phase 3: Dashboard Configuration System

#### Admin Features
- [x] **"+ New Dashboard Config" Button** - Prominent gradient button in header
  - Modal dialog for creating new configurations
  - Feature type selection (PA/AC/SPEND)
  - Custom naming for variants

- [x] **Custom Configs on Feature Page**
  - New configs appear as separate cards on "Select Analytics Feature" page
  - Purple "Layers" icon distinguishes custom configs from base features
  - Feature type badge (PA/AC/SPEND) for quick identification
  - Configs persist across sessions (localStorage)

#### Profile Builder
- [x] **Template Builder Mode** - Full panel configuration
  - Panel naming and management
  - Multi-select dropdowns for Events, Platforms, POS, Sources
  - Graph type selection (Line/Bar)
  - Pie chart toggles (Platform/POS/Source distribution)
  - Live preview of panel data

- [x] **Quick Builder Mode** - Simplified panel creation
  - Card-based panel overview
  - Quick add/delete functionality

- [x] **Combine Panels Feature** - Merge two panels into one
  - Combines ALL filter arrays (events, platforms, pos, sources)
  - Merges event configurations with unique values
  - Auto-renames combined panel

### Phase 4: Filter Persistence

- [x] **Filter Config Storage** - Saved in panel's `filterConfig` property
  ```typescript
  filterConfig: {
    events: number[];
    platforms: number[];
    pos: number[];
    sources: number[];
    graphType: 'line' | 'bar';
  }
  ```

- [x] **Load Saved Filters** - When editing/viewing profiles
  - ProfileBuilder loads saved filterConfig from panels
  - DashboardViewer applies saved filters on load

### Phase 5: Feature-Specific Events

- [x] **Events Scoped to Feature Type**
  - PA (Price Alert) → Only PA events from `/api/eventsList?feature=PA`
  - AC (Auto-Coupon) → Only AC events from `/api/eventsList?feature=AC`
  - SPEND (Spend-Lens) → Only SPEND events from `/api/eventsList?feature=SPEND`

### Phase 6: UI/UX Improvements

#### Chart Aesthetics
- [x] **Gradient Area Charts** - Beautiful filled area charts
  - Smooth gradient fills from opacity 0.3 to 0
  - Multiple data series (Total, Success, Fail)
  - Clean axis styling with subtle grid lines

- [x] **Enhanced Pie Charts**
  - Donut style with inner radius
  - Padding between segments
  - Responsive legends
  - Smooth tooltips with shadows

- [x] **Stat Cards** - Gradient backgrounds
  - Blue gradient for Total Count
  - Green gradient for Success Count
  - Red gradient for Fail Count
  - Purple gradient for Selected Events

#### Component Styling
- [x] **Cards with Gradient Borders** - Subtle color accents
- [x] **Responsive Tooltips** - Rounded, shadowed, semi-transparent
- [x] **Filter Section** - Highlighted with primary color border

---

## 📁 File Structure

```
src/
├── components/
│   ├── dashboard/
│   │   └── analytics/
│   │       ├── AnalyticsLayout.tsx      # Main layout with + button modal
│   │       ├── AnalyticsLogin.tsx       # Authentication
│   │       ├── DashboardViewer.tsx      # View mode with filters & charts
│   │       ├── FeatureSelector.tsx      # Feature cards + custom configs
│   │       ├── ProfileSidebar.tsx       # Profile list sidebar
│   │       └── admin/
│   │           ├── ProfileBuilder.tsx   # Create/edit profiles
│   │           ├── PanelPreview.tsx     # Live panel preview
│   │           └── PanelCombineModal.tsx # Combine panels dialog
│   └── ui/
│       └── multi-select-dropdown.tsx    # Reusable multi-select
├── services/
│   ├── apiService.ts                    # Real API integration
│   └── mockData.ts                      # Local storage persistence
├── types/
│   └── analytics.ts                     # TypeScript interfaces
└── contexts/
    └── AnalyticsAuthContext.tsx         # Auth state management
```

---

## 🔧 Technical Details

### API Request Format
```typescript
{
  filter: {
    eventId: number[],    // e.g., [1, 2, 3]
    pos: number[],        // e.g., [2, 63]
    platform: number[],   // e.g., [0, 1, 2]
    source: number[]      // e.g., [1, 2, 3, 8]
  },
  startTime: "YYYY-MM-DD",
  endTime: "YYYY-MM-DD",
  isHourly: boolean
}
```

### API Response Format (isHourly: true)
```json
{
  "status": 1,
  "message": "Success!",
  "data": [{
    "platform": 0,
    "pos": 63,
    "timestamp": "2025-11-27T18:30:00.000Z",
    "eventId": 2,
    "source": 1,
    "count": 163,
    "successCount": 122,
    "failCount": 41
  }]
}
```

### API Response Format (isHourly: false)
```json
{
  "status": 1,
  "message": "Success!",
  "data": [{
    "platform": 0,
    "source": 1,
    "pos": 63,
    "timestamp": "2025-11-27T00:00:00.000Z",
    "eventId": 2,
    "count": 163,
    "successCount": 122,
    "failCount": 41,
    "avgDelay": "0.00",
    "medianDelay": 0,
    "modeDelay": 0
  }]
}
```

---

## 🚀 Future Enhancements

### Planned Features

#### Drag & Drop Panel Arrangement
- [ ] Drag panels to reorder
- [ ] Resize panels (width/height)
- [ ] Grid-based positioning system

#### Advanced Filtering
- [ ] Save filter presets
- [ ] Quick filter buttons
- [ ] Date range presets (Today, Yesterday, Last 7/30 days)

#### Export & Sharing
- [ ] Export charts as PNG/PDF
- [ ] Export data as CSV/Excel
- [ ] Share dashboard links

#### Real-time Updates
- [ ] WebSocket integration for live data
- [ ] Configurable auto-refresh intervals
- [ ] Push notifications for critical alerts

#### User Management
- [ ] Role-based access control
- [ ] Profile ownership/permissions
- [ ] Activity logging

#### Performance
- [ ] Data caching layer
- [ ] Virtualized lists for large datasets
- [ ] Lazy loading for off-screen panels

---

## 📝 Configuration Examples

### Creating a New Dashboard Config
1. Click **"+ New Dashboard Config"** button
2. Enter a name (e.g., "Price Alert - Production")
3. Select feature type (PA/AC/SPEND)
4. Click **"Create Config"**
5. Add panels with specific filters
6. Save the profile

### Combining Panels
1. Open profile in Template Builder
2. Click **"Combine"** on a panel
3. Select target panel to merge into
4. Confirm - filters are merged:
   - `Panel A: Events [1,2] + Panel B: Events [3,4] = Combined: Events [1,2,3,4]`

---

## 🛠 Development Notes

### Key Constants
```typescript
// Platforms (0-8)
PLATFORMS = [
  { id: 0, name: 'Chrome Extension' },
  { id: 1, name: 'Android App' },
  { id: 2, name: 'iOS App' },
  // ...
];

// Sources
SOURCES = [
  { id: 1, name: 'Spidy' },
  { id: 2, name: 'Kafka' },
  { id: 3, name: 'Self' },
  { id: 8, name: 'Graph' },
];

// Feature to API mapping
FEATURE_API_MAP = {
  'price_alert': 'PA',
  'auto_coupon': 'AC',
  'spend_lens': 'SPEND'
};
```

### Local Storage Keys
- `dashboard_profiles` - All saved dashboard profiles/configs

---

## 📅 Changelog

### November 2025
- Initial implementation of config-based analytics dashboard
- Real API integration (graph, pieChart, eventsList, siteDetails)
- Multi-select dropdowns with numeric ID support
- Admin "+" button for creating new dashboard configs
- Custom configs displayed on feature selection page
- Panel combine feature with proper filter merging
- Filter persistence on save/load
- Feature-specific events (PA/AC/SPEND scoping)
- Enhanced chart aesthetics with gradients
- Proper isHourly response handling

---

*Last Updated: November 30, 2025*
