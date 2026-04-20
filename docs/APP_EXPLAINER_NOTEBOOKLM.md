# Jam Session Assistant — Product Explainer Script Base

## Elevator Pitch

Jam Session Assistant is a collaborative music coordination platform for small groups, bands, and rotating communities of musicians.  
Its purpose is to reduce the friction that happens before people start playing: deciding what to play, checking who knows what, finding support material, and sharing updates after sessions.

Instead of relying on memory, fragmented chats, and ad-hoc links, the app centralizes discovery, decision-making, and communication in one workflow.

---

## The Problem It Solves

In many informal or semi-structured music groups, the same inefficiencies repeat:

- Musicians spend too much time asking who knows which songs.
- Repertoire knowledge is distributed across people, not documented.
- Song references (lyrics, chords, recordings) are scattered.
- Session continuity depends on chat history and individual memory.
- After a session, useful context (videos, invites, next ideas) is hard to keep organized.

This creates downtime, weakens momentum, and reduces the number of songs the group can actually perform in a session.

---

## Core Product Vision

The platform is designed around one guiding principle:

**Help a group reach playable consensus quickly, then keep musical context alive between sessions.**

That vision is implemented through five connected modules:

1. **Jam** for overlap-based song matching.
2. **Songs** for maintaining a shared catalog.
3. **Repertoire** for each musician’s playable set.
4. **Friends** for building a relevant network graph.
5. **Feed** for ongoing social and practical coordination.

---

## How the App Works (Feature-by-Feature)

## 1) Songs (Catalog Layer)

Songs is the shared structured database of music references.

Users can register:

- Title
- Artist
- Language
- Lyrics URL
- Listening URL (audio/video reference)

This creates a clean foundation for discovery and matching.

## 2) Repertoire (Personal Capability Layer)

Repertoire represents songs that each musician can currently perform.

This is critical because a catalog alone does not indicate readiness.  
Repertoire transforms static song data into practical performance availability.

## 3) Jam (Decision Layer)

Jam uses repertoire overlap to suggest songs the current group is most likely to perform successfully.

The recommendation logic emphasizes shared readiness:

- Songs known by more participants receive higher relevance.
- The interface guides users toward fast, low-friction first choices.
- The group can move from “what can we play?” to “let’s start now” faster.

## 4) Friends (Network Layer)

Friends enables users to build and manage a musician network.

This network acts as the social graph that powers discovery and relevance in other areas (especially feed visibility and collaboration context).

## 5) Feed (Continuity Layer)

Feed supports lightweight social coordination around music activity:

- Share session updates
- Post references or media
- React and comment
- Keep session context available asynchronously

This extends collaboration beyond the live moment and reduces reset cost for future sessions.

---

## End-to-End User Journey

Typical flow:

1. User enters the app and sees a guided onboarding walkthrough.
2. User adds or reviews songs in the catalog.
3. User marks playable songs in personal repertoire.
4. Group opens Jam and gets high-overlap song suggestions.
5. During/after sessions, users exchange context in Feed.
6. Over time, Friends + Feed + Repertoire improve suggestion quality and session speed.

---

## Why This Is Valuable

The app delivers value in three levels:

- **Operational value:** less time choosing, more time playing.
- **Coordination value:** clearer shared visibility of capabilities and references.
- **Community value:** stronger continuity between sessions through a focused music network.

In short, it transforms fragmented group coordination into a repeatable, data-assisted music workflow.

---

## Hosting / Technical Context (High Level)

The application runs as a modern web app stack:

- **Frontend:** deployed on Vercel.
- **Backend and database:** Supabase (BaaS with relational database and APIs).

This architecture supports fast iteration, integrated auth/data workflows, and production deployment with low operational overhead.

---

## Suggested Video Narrative Structure (for NotebookLM)

1. **Hook (problem):** “Why music groups lose time before they even play.”
2. **Vision:** “A platform that turns repertoire overlap into immediate action.”
3. **Walkthrough:** Songs → Repertoire → Jam → Friends → Feed.
4. **Practical example:** how a group converges on playable songs faster.
5. **Outcome:** better session flow, better continuity, stronger collaboration.
6. **Close:** “From coordination friction to musical momentum.”
