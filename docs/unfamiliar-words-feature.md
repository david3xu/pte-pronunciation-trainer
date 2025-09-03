# Unfamiliar Words Focus Mode - Feature Update

## 🎉 What's New

**New Learning Mode**: 🔥 Unfamiliar Words Focus
- **944 curated challenging terms** from actual CCL conversations
- **Hand-selected vocabulary** from 33 dialogues (70248-70213)
- **Advanced difficulty focus** - perfect for exam preparation

## 📊 Dataset Breakdown

| Category | Terms | Coverage |
|----------|-------|----------|
| **Business** | 445 terms | Banking, finance, employment |
| **Social** | 316 terms | Community services, interactions |
| **Legal** | 147 terms | Court procedures, compliance |
| **Medical** | 36 terms | Healthcare consultations |

## 🎯 How to Use

1. **Select Mode**: Choose "🔥 Unfamiliar Words" from the Mode dropdown
2. **Choose Group**: Select dialogue groups (Group 1-10, latest to earliest)
3. **Set Difficulty**: Filter by Easy/Normal/Hard if desired
4. **Start Learning**: Use any of the 4 repeat modes for pronunciation practice

## 🔄 Auto-Update Process

**For Content Updates**:
1. Edit `data-processing/extractors/unfamilar-words.md`
2. Add dialogue numbers and challenging terms
3. Commit and push to GitHub
4. Vercel automatically rebuilds and deploys

**Data Format**:
```
70248
community center 
diverse 
older people

70247
drop by 
swing by 
delayed
```

## 🛠️ Technical Details

- **Data Source**: `unfamilar-words.md` → processed into structured JSON
- **Matching Algorithm**: 92% success rate matching with complete dataset
- **Context Preservation**: Each term includes original sentence and dialogue info
- **Integration**: Seamlessly works with existing filtering and playback features

## 📈 Impact

- **Targeted Learning**: Focus on the most challenging CCL vocabulary
- **Efficient Study**: No time wasted on easy terms you already know
- **Exam Preparation**: Practice the exact terms that appear in difficult conversations
- **Progressive Difficulty**: Start with Group 1 (latest) and work backwards

---

*This feature complements the existing Vocabulary Focus (6,967 terms) and Dialogue Practice modes, giving users three distinct learning approaches for comprehensive CCL preparation.*