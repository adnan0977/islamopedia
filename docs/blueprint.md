# **App Name**: VlogNest

## Core Features:

- User Authentication: Allow users to register and log in securely using email and password, powered by Firebase authentication. While basic content (e.g., Quran integration) is viewable by all, authentication is required to access personalized features, manage user content, and perform uploads.
- YouTube Account Linkage: Securely connect the user's YouTube account to enable direct video uploads and channel management.
- Direct YouTube Upload: Publish edited videos directly to their linked YouTube channel with appropriate metadata. This feature is only available for authenticated users.
- YouTube Video/Channel Import: Enable users to upload individual YouTube videos by providing a video URL or ID. Also, allow importing all videos from a specified YouTube channel by providing its channel ID.
- AI-Generated Title & Description Tool: Generate creative and engaging title and description suggestions for videos using an AI tool, based on content analysis or user-provided keywords.
- AI Video Categorization & Tagging Tool: Automatically analyze video content to generate relevant categories and tags using an AI tool, improving searchability and discoverability of videos within the app.
- My Channel Video Feed: View and manage the authenticated user's own uploaded YouTube videos, organized by channel, within the app.
- Quran Content Integration: Integrate Quran content with all available languages, audio recitations, translations, and transcriptions by utilizing the alquran.cloud API. This feature allows users to browse and listen to surahs and ayats, and dynamically displays 'Today's Ayats' or those selected by an AI tool based on their importance for the day.
- AI Custom Indexing Tool: Create a personalized content index for each user, dynamically adapting and organizing videos based on their viewing patterns and preferences using an AI tool.
- Favorite Video Display: Showcase videos marked as favorites by the user in a dedicated grid on the index page.
- Trending Video Display: Present a curated grid of trending videos to users on the application's index page.
- Channel Browsing Display: Allow users to browse and discover various YouTube channels within the app through a dedicated list or grid.
- Namaz Timing and Hijri Calendar Integration: Display Namaz timings based on the user's location and integrate a Hijri calendar linked with the English calendar, with the Hijri date also adapting to the user's location.

## Style Guidelines:

- The chosen color scheme is dark to provide a clean and engaging backdrop for video content. Primary color: a vibrant digital blue (#527EFF), evoking technology and professionalism. Background color: a desaturated, deep blue-grey (#202426) for visual comfort during viewing. Accent color: a bright, energetic orange-yellow (#FFCE43), used for interactive elements and call-to-actions, ensuring high visibility.
- Body and headline font: 'PT Sans' (humanist sans-serif) for its modern, legible, and friendly appearance, suitable for diverse content lengths on mobile screens.
- Clean, outlined, and minimal line-art style icons should be used consistently throughout the application, maintaining clarity and modern aesthetics, particularly for video recording, editing, and upload functions.
- A mobile-first, intuitive layout emphasizing quick access to recording and viewing features. A card-based design will organize video previews and channel listings, with ample negative space to reduce visual clutter.
- Subtle, smooth transitions for screen navigation and view changes. Clear and concise loading animations, and engaging feedback animations for actions like successful video uploads.