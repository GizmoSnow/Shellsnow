# Success Roadmap Builder

A full-stack web application for creating and managing quarterly success roadmaps with authentication, data persistence, and PowerPoint export.

## Setup Instructions

### 1. Configure Supabase

Update the `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

## Features

- **User Authentication**: Sign up and log in with email/password
- **Multiple Roadmaps**: Create, name, and manage multiple roadmaps per user
- **Data Persistence**: All changes auto-save to Supabase database
- **Professional Design**: Dark, modern UI matching the original prototype
- **PowerPoint Export**: Export roadmaps to .pptx files
- **Print Support**: Print roadmaps directly from the browser
- **Manage Goals**: Edit goals, initiatives, and activities
- **Activity Types**: CSM-led, Architect, Specialist, Review, Event, Partner, Trailhead

## Database Schema

The application uses a `roadmaps` table with:
- User authentication through Supabase Auth
- Row Level Security (RLS) for data isolation
- JSON storage for flexible roadmap data structure

## Usage

1. Sign up or log in to your account
2. Create a new roadmap from the dashboard
3. Add goals, initiatives, and activities by quarter
4. Edit goal details and colors using the Edit Goals panel
5. Changes save automatically
6. Export to PowerPoint or print when ready
