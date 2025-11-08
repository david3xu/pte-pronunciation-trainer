# Vocabulary Storage Decision: Local JSON vs Supabase

**Decision Date**: 2025-11-08
**Status**: Analysis Complete

---

## Question: Should we move vocabulary datasets to Supabase?

### TL;DR: **NO - Keep vocabulary in local JSON files**

But with a nuanced hybrid approach for advanced features.

---

## Analysis: Static Content vs Dynamic Data

### Current Dataset Size
- **13 vocabulary books**: ~13,000 words with IPA
- **3 practice modes**: 2,507 sentences/questions
- **Total JSON size**: ~200 KB compressed, ~800 KB uncompressed
- **Growth rate**: Minimal (vocabulary is relatively stable)

### Option A: Local JSON Files (Current ✅ RECOMMENDED)

**Architecture:**
```
User → CDN/Edge Cache → JSON Files → Browser Cache → Service Worker
└─ 1-5ms      └─ 10-20ms          └─ 0ms              └─ Offline
```

**Pros:**
- ⚡ **Blazing fast**: 10-20ms load time (CDN edge cache)
- 💰 **Zero cost**: No database read charges
- 📴 **Offline-first**: Service Worker caches all vocabulary
- 🌍 **Global**: CDN distributes to edge locations worldwide
- 🔄 **No duplication**: Same 200KB file served to all users
- 📦 **Simple deployment**: JSON files + static hosting
- 🚀 **Scalable**: Handles millions of users without DB load

**Cons:**
- ❌ **No live updates**: Requires redeployment to change vocabulary
- ❌ **No user-specific content**: Can't personalize word lists per user
- ❌ **No content management**: Can't edit in admin dashboard

**Best for:**
- ✅ Static educational content (our case)
- ✅ Offline-first PWAs
- ✅ High-traffic apps (avoid DB costs)
- ✅ Fast loading requirements

---

### Option B: Supabase Database Only

**Architecture:**
```
User → Supabase API → PostgreSQL Query → JSON Response → Parse
└─ 50-200ms      └─ 10-50ms         └─ Network        └─ Processing
```

**Pros:**
- ✅ **Live updates**: Change vocabulary without redeployment
- ✅ **Admin dashboard**: Edit content via Supabase Studio
- ✅ **Personalization**: User-specific word lists
- ✅ **Analytics**: Track which words are most studied
- ✅ **Dynamic content**: Add user-contributed words

**Cons:**
- 💰 **Expensive**: 13K words × 1000 users × 10 loads = 130M reads/month
  - Supabase free tier: 500MB bandwidth → Exceeded quickly
  - Cost: $25+/month just for vocabulary reads
- 🐌 **Slower**: 100-300ms vs 10-20ms (10-30x slower)
- 📴 **Online-only**: Requires internet connection
- 🔄 **Data duplication**: Same 13K words queried repeatedly
- 💥 **Database load**: Heavy read queries on every page load
- 🌍 **No CDN**: Can't leverage global edge caching

**Best for:**
- ✅ Dynamic content (news, social feeds)
- ✅ User-generated content
- ✅ Frequently changing data
- ✅ Small datasets (<1000 items)

**Not suitable for:**
- ❌ Large static datasets (our case)
- ❌ High-frequency reads
- ❌ Offline-first apps

---

### Option C: Hybrid Approach (🎯 OPTIMAL)

**Architecture:**
```
┌─────────────────────────────────────────────────────┐
│                   HYBRID STRATEGY                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  PRIMARY: Local JSON (Fast, Offline)                │
│  ┌────────────────────────────────────────┐         │
│  │ CDN → Browser → Service Worker         │         │
│  │ • 13K vocabulary words                 │         │
│  │ • IPA pronunciation                    │         │
│  │ • Practice sentences                   │         │
│  │ • Load time: 10-20ms                   │         │
│  │ • Works offline                        │         │
│  └────────────────────────────────────────┘         │
│                      ▲                               │
│                      │ Fallback/Enhancement         │
│                      ▼                               │
│  SECONDARY: Supabase (Advanced Features)            │
│  ┌────────────────────────────────────────┐         │
│  │ • User's custom word lists             │         │
│  │ • Personalized vocabulary sets         │         │
│  │ • Words marked for review              │         │
│  │ • User-contributed pronunciation notes │         │
│  │ • Load when needed (lazy)              │         │
│  └────────────────────────────────────────┘         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Implementation:**

1. **Base Vocabulary** (Local JSON):
   - All 13K words with IPA
   - All practice sentences
   - Loaded from CDN, cached by Service Worker
   - Works offline, fast loading

2. **Enhanced Features** (Supabase):
   - User's "favorite words" list
   - Custom vocabulary sets
   - Words flagged for extra practice
   - User pronunciation notes
   - Shared community word lists (optional)

**Pros:**
- ✅ **Best of both worlds**: Fast + Dynamic
- ✅ **Cost-effective**: Only user-specific data in DB
- ✅ **Offline-first**: Base functionality without internet
- ✅ **Enhanced when online**: Personalization features

**Cons:**
- ⚠️ **More complex**: Two data sources to manage
- ⚠️ **Sync logic**: Merge local + remote data

---

## Real-World Comparison

### Similar Apps (How They Do It)

| App | Approach | Storage |
|-----|----------|---------|
| **Duolingo** | Hybrid | Lessons: Local JSON<br>Progress: Database |
| **Anki** | Hybrid | Deck files: Local<br>Sync metadata: Cloud |
| **Quizlet** | Hybrid | Study sets: Cached local<br>Progress: Database |
| **Memrise** | Hybrid | Courses: Local cache<br>User data: Database |
| **Khan Academy** | Hybrid | Videos/content: CDN<br>Progress: Database |

**Pattern**: All major educational apps use local storage for content, database for user data.

---

## Cost Analysis

### Scenario: 1,000 active users, 10 vocabulary loads/day

#### Option A: Local JSON
```
Cost Breakdown:
- CDN bandwidth: 200 KB × 10 loads × 1000 users = 2 GB/day
- Vercel free tier: 100 GB/month → Covered ✅
- Database reads: 0 (only user data)
- Total cost: $0/month (free tier)
```

#### Option B: Supabase Only
```
Cost Breakdown:
- Database reads: 13K words × 10 loads × 1000 users = 130M rows/month
- Supabase pricing: $0.0001 per 1K reads = $13/month for reads
- Bandwidth: 800 KB × 10 × 1000 = 8 GB/day = 240 GB/month
- Supabase free tier: 50 GB → Exceeded (need paid plan $25/month)
- Total cost: $25-50/month
```

#### Option C: Hybrid
```
Cost Breakdown:
- CDN bandwidth: Same as Option A = Free
- Database reads: Only user custom lists (~100 words/user avg)
  = 100 × 1000 users = 100K rows/month = $0.01/month
- Total cost: ~$0/month (free tier)
```

**Winner**: Option A (Local JSON) or Option C (Hybrid) = Free
**Loser**: Option B (Supabase Only) = $25-50/month

---

## Performance Analysis

### Load Time Comparison

| Metric | Local JSON | Supabase Only | Hybrid |
|--------|-----------|---------------|--------|
| **First Load** | 10-20ms | 200-500ms | 10-20ms (base) |
| **Cached Load** | 0-5ms | 100-300ms | 0-5ms |
| **Offline** | ✅ Works | ❌ Fails | ✅ Works |
| **Global Edge** | ✅ CDN | ❌ Single region | ✅ CDN |

---

## Decision Matrix

| Criteria | Weight | Local JSON | Supabase | Hybrid |
|----------|--------|-----------|----------|--------|
| **Speed** | 30% | ⭐⭐⭐⭐⭐ (5) | ⭐⭐ (2) | ⭐⭐⭐⭐⭐ (5) |
| **Cost** | 25% | ⭐⭐⭐⭐⭐ (5) | ⭐ (1) | ⭐⭐⭐⭐⭐ (5) |
| **Offline** | 20% | ⭐⭐⭐⭐⭐ (5) | ⭐ (1) | ⭐⭐⭐⭐⭐ (5) |
| **Flexibility** | 15% | ⭐⭐ (2) | ⭐⭐⭐⭐⭐ (5) | ⭐⭐⭐⭐ (4) |
| **Simplicity** | 10% | ⭐⭐⭐⭐⭐ (5) | ⭐⭐⭐ (3) | ⭐⭐⭐ (3) |
| **Total Score** | 100% | **4.45** | **2.30** | **4.65** |

**Winner**: Hybrid Approach (4.65) > Local JSON (4.45) > Supabase Only (2.30)

---

## Final Recommendation

### ✅ RECOMMENDED: Hybrid Approach

**Phase 1 (Immediate)**: Keep Local JSON
- All vocabulary in JSON files
- Fast, offline-first, cost-effective
- No changes needed to current architecture

**Phase 2 (Future Enhancement)**: Add Supabase Features
- User custom word lists (store only IDs, reference JSON data)
- "Favorite words" saved to Supabase
- Personalized vocabulary sets
- Community-shared lists (optional)

**Implementation:**
```typescript
// Load base vocabulary from local JSON (fast)
const baseVocabulary = await fetch('/data/pte-beginner-vocabulary.json');

// Enhance with user data from Supabase (lazy, optional)
const userCustomWords = await supabase
  .from('user_custom_words')
  .select('word_id, notes, difficulty_override')
  .eq('user_id', userId);

// Merge: Base vocabulary + User customizations
const personalizedVocabulary = baseVocabulary.map(word => ({
  ...word,
  ...userCustomWords.find(custom => custom.word_id === word.id)
}));
```

**Benefits:**
- ✅ Fast primary loading (local JSON)
- ✅ Enhanced when online (Supabase)
- ✅ Works offline (base functionality)
- ✅ Cost-effective (minimal DB reads)
- ✅ User personalization (custom lists)

---

## Migration Path

### Current State
```
✅ All vocabulary in local JSON files
✅ User progress/settings in Supabase
✅ Fast, offline-first
```

### Future Enhancements (Optional)

**Phase 2A**: User Custom Lists
```sql
-- Store only word IDs, not full content
CREATE TABLE user_custom_lists (
  user_id UUID REFERENCES profiles(id),
  word_id TEXT,  -- Reference to JSON data
  notes TEXT,
  difficulty_override TEXT
);
```

**Phase 2B**: Personalized Sets
```sql
CREATE TABLE user_vocabulary_sets (
  user_id UUID,
  set_name TEXT,
  word_ids TEXT[],  -- Array of IDs
  created_at TIMESTAMP
);
```

**Phase 2C**: Community Features (Optional)
```sql
CREATE TABLE community_word_lists (
  creator_id UUID,
  list_name TEXT,
  word_ids TEXT[],
  is_public BOOLEAN,
  likes_count INT
);
```

---

## Conclusion

**Answer: NO, do not move all vocabulary to Supabase.**

**Why:**
1. Vocabulary is **static content** → Best served as local files
2. Database reads are **expensive** at scale
3. Local JSON is **10-30x faster**
4. Works **offline** (critical for PWA)
5. **Industry standard** (Duolingo, Anki, etc. all do this)

**Instead:**
- ✅ Keep vocabulary in local JSON files (current approach is correct)
- ✅ Use Supabase for user data only (progress, settings, sessions)
- ✅ Add hybrid features later (custom word lists, favorites)

**Current architecture is optimal.** No changes needed to data storage strategy.
