# Release Notes - v2.2.0: Complete 10-Book Vocabulary Collection

**Release Date**: 2025-10-08  
**Version**: 2.2.0  
**Git Commit**: dd819bb

---

## 🎉 Overview

Successfully expanded the PTE Pronunciation Trainer from **6 vocabulary books** to **10 vocabulary books** by adding the 4 missing books from the `data/source/pte/vocabs/` directory. The app now includes every available vocabulary book!

---

## ✨ New Features

### 4 New Vocabulary Books Added

1. **⭐ PTE Must-Know Vocabulary** (`pte-must-know`)
   - **1,397 essential terms** with IPA pronunciation
   - Must-know vocabulary for guaranteed passing classes
   - File: `pte-must-know-vocabulary.json` (571KB)

2. **✍️ PTE WFD Vocabulary** (`pte-wfd-vocab`)
   - Write From Dictation vocabulary with IPA
   - File: `pte-wfd-vocabulary.json` (533KB)

3. **📖 PTE Reading FIB Vocabulary** (`pte-reading-fib`)
   - Reading Fill-in-the-Blanks vocabulary with IPA
   - File: `pte-reading-fib-vocabulary.json` (129KB)

4. **🔀 PTE Reading FIB Drag Vocabulary** (`pte-reading-fib-drag`)
   - Reading FIB (Drag & Drop) vocabulary with IPA
   - File: `pte-reading-fib-drag-vocabulary.json` (306KB)

---

## 📊 Statistics

### Before v2.2.0
- **6 vocabulary books**
- Total vocabulary terms: ~4,500

### After v2.2.0
- **10 vocabulary books** ✅
- Total vocabulary terms: **~6,900+**
- **100% coverage** of all vocabulary books in `/data/source/pte/vocabs/`

---

## 🔄 Auto-Loop Cycle (10 Books)

The auto-loop feature now cycles through all 10 books in this order:

```
🎧 FIB Listening 
   ↓
📗 Beginner
   ↓
📘 Intermediate
   ↓
📕 Advanced
   ↓
📚 Read Aloud (RA)
   ↓
🎯 Repeat Sentence (RS)
   ↓
⭐ Must-Know
   ↓
✍️ WFD Vocab
   ↓
📖 Reading FIB
   ↓
🔀 Reading FIB Drag
   ↓
🔄 (loops back to FIB Listening)
```

---

## 🛠️ Technical Changes

### Files Modified

1. **`src/js/shared/Config.js`**
   - Added 4 new books to `pipeline.registry`
   - Added 4 new books to `data.learningModes` array
   - Added 4 new books to `data.datasetFiles` registry

2. **`src/js/ui/UIController.js`**
   - Updated `modeLabels` in `updateBookDisplay()` method
   - Added display labels for all 10 books

3. **`sw.js`** (Service Worker)
   - Bumped cache version: v43 → v44
   - Added 4 new vocabulary datasets to both dev and production cache lists

### New Generated Files

All 4 new vocabulary books were processed by the data pipeline (`npm run data:pte`):

```bash
data/processed/
├── pte-must-know-vocabulary.json        (571KB, 1,397 terms)
├── pte-wfd-vocabulary.json              (533KB)
├── pte-reading-fib-vocabulary.json      (129KB)
└── pte-reading-fib-drag-vocabulary.json (306KB)
```

---

## 📝 Configuration Updates

### Pipeline Registry
```javascript
{
  id: 'pte-must-know',
  input: 'pte-must-know-vocabulary-with-ipa.md',
  output: 'pte-must-know-vocabulary.json',
  category: 'pte-must-know',
  description: 'PTE Must-Know Vocabulary (1,397 essential terms with IPA)',
  sourceType: 'pte-must-know-vocabulary-with-ipa',
  dataType: 'vocabulary',
  extractorType: 'PTETermsExtractor',
  inputSubdir: 'vocabs',
  isDefault: false
}
// + 3 more similar entries
```

### Learning Modes
```javascript
learningModes: [
  { id: 'pte-fib-listening', label: '🎧 PTE FIB Listening', dataset: 'pte-fib-listening-with-ipa' },
  { id: 'pte-beginner', label: '📗 PTE Beginner Vocabulary', dataset: 'pte-beginner-vocabulary-with-ipa' },
  { id: 'pte-intermediate', label: '📘 PTE Intermediate Vocabulary', dataset: 'pte-intermediate-vocabulary-with-ipa' },
  { id: 'pte-advanced', label: '📕 PTE Advanced Vocabulary', dataset: 'pte-advanced-vocabulary-with-ipa' },
  { id: 'pte-ra', label: '📚 PTE Read Aloud (RA) Vocabulary', dataset: 'pte-ra-vocabulary-with-ipa' },
  { id: 'pte-rs', label: '🎯 PTE Repeat Sentence (RS) Vocabulary', dataset: 'pte-rs-vocabulary-with-ipa' },
  { id: 'pte-must-know', label: '⭐ PTE Must-Know Vocabulary', dataset: 'pte-must-know-vocabulary-with-ipa' },      // NEW
  { id: 'pte-wfd-vocab', label: '✍️ PTE WFD Vocabulary', dataset: 'pte-wfd-vocabulary-with-ipa' },                // NEW
  { id: 'pte-reading-fib', label: '📖 PTE Reading FIB Vocabulary', dataset: 'pte-reading-fib-vocabulary-with-ipa' }, // NEW
  { id: 'pte-reading-fib-drag', label: '🔀 PTE Reading FIB Drag Vocabulary', dataset: 'pte-reading-fib-drag-vocabulary-with-ipa' } // NEW
]
```

---

## 🧪 Testing Instructions

### 1. Clear Browser Cache
Since service worker was updated to v44, users should:
1. Open DevTools → Application → Service Workers
2. Click "Unregister" on old service worker
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### 2. Verify All 10 Books in Dropdown
Check Settings → Learning Mode dropdown shows:
- ✅ 🎧 PTE FIB Listening
- ✅ 📗 PTE Beginner Vocabulary
- ✅ 📘 PTE Intermediate Vocabulary
- ✅ 📕 PTE Advanced Vocabulary
- ✅ 📚 PTE Read Aloud (RA) Vocabulary
- ✅ 🎯 PTE Repeat Sentence (RS) Vocabulary
- ✅ ⭐ PTE Must-Know Vocabulary (NEW)
- ✅ ✍️ PTE WFD Vocabulary (NEW)
- ✅ 📖 PTE Reading FIB Vocabulary (NEW)
- ✅ 🔀 PTE Reading FIB Drag Vocabulary (NEW)

### 3. Test Auto-Loop
1. Select any vocabulary book
2. Click PLAY button
3. Let it play through to the end of the book
4. Verify it auto-loops to the next book in sequence
5. Test manual NEXT/PREV buttons work correctly

### 4. Test Each New Book
For each of the 4 new books:
- Select the book from dropdown
- Verify word count displays correctly
- Play first few words to test TTS
- Check IPA pronunciation displays properly
- Test filtering by difficulty (if applicable)

---

## 🐛 Known Issues

None reported. All 10 books tested and working correctly.

---

## 📦 Deployment

### For Static Hosting (Vercel/Netlify)
```bash
# Push to repository
git push origin pte

# Vercel/Netlify will auto-deploy
# No additional steps needed
```

### For Custom Server
```bash
# Copy new JSON files to server
scp data/processed/pte-must-know-vocabulary.json server:/path/to/app/data/processed/
scp data/processed/pte-wfd-vocabulary.json server:/path/to/app/data/processed/
scp data/processed/pte-reading-fib-vocabulary.json server:/path/to/app/data/processed/
scp data/processed/pte-reading-fib-drag-vocabulary.json server:/path/to/app/data/processed/

# Update service worker and config files
scp sw.js server:/path/to/app/
scp src/js/shared/Config.js server:/path/to/app/src/js/shared/
scp src/js/ui/UIController.js server:/path/to/app/src/js/ui/
```

---

## 🎯 Next Steps (Future Enhancements)

1. **User Progress Tracking**
   - Track which books are completed
   - Save progress per book
   - Show completion badges

2. **Custom Learning Paths**
   - Allow users to create custom book sequences
   - Skip certain books
   - Repeat specific books

3. **Statistics Dashboard**
   - Total words learned across all books
   - Time spent on each book
   - Most difficult words

4. **Spaced Repetition**
   - Review words from completed books
   - Algorithm to bring back difficult words
   - Long-term retention tracking

---

## 👨‍💻 Developer Notes

### Adding More Vocabulary Books in Future

If more `.md` files are added to `data/source/pte/vocabs/`, follow this process:

1. **Add to Config.js pipeline.registry**:
```javascript
{
  id: 'new-book-id',
  input: 'new-book-with-ipa.md',
  output: 'new-book.json',
  category: 'new-book-category',
  description: 'Description',
  sourceType: 'new-book-with-ipa',
  dataType: 'vocabulary',
  extractorType: 'PTETermsExtractor',
  inputSubdir: 'vocabs',
  isDefault: false
}
```

2. **Add to learningModes array**:
```javascript
{ id: 'new-book-id', label: '🆕 New Book Label', dataset: 'new-book-with-ipa' }
```

3. **Add to datasetFiles**:
```javascript
'new-book-id': { file: 'new-book.json', type: 'vocabulary' }
```

4. **Update UIController modeLabels**:
```javascript
'new-book-id': '🆕 New Book Label'
```

5. **Run data pipeline**:
```bash
npm run data:pte
```

6. **Update service worker**:
- Bump `CACHE_VERSION`
- Add `/data/processed/new-book.json` to both dev and prod cache lists

7. **Test and commit**!

---

## 📄 License

Same as main project.

---

## 🙏 Acknowledgments

Thanks to the PTE vocabulary contributors who compiled all 10 vocabulary books with IPA pronunciations!

---

## 📞 Support

If you encounter any issues with the new vocabulary books:
1. Check browser console for errors
2. Clear service worker cache
3. Verify all 4 new JSON files exist in `data/processed/`
4. Report issues with specific book name and error message
