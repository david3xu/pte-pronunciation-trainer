import fs from 'fs';

// File paths
const b1FilePath = './data/source/pte/essay-examples/vocabulary-based/essay-examples-template-b1.md';
const masterFilePath = './data/source/pte/essay-examples/new-example/complete-37-essays.md';

// The Master List of 37 Questsions
const masterQuestions = [
  { id: 1, title: "Employee Decision Making", question: "In some companies, some employers involve employees in the decision-making process of products and services. What are the advantages and disadvantages of such a policy?" },
  { id: 2, title: "Formal Written Examinations", question: "The formal written examination can be a valid method to assess students' learning. To what extent do you agree or disagree? Use your own experience." },
  { id: 3, title: "Travel and Education", question: "“The value of travel has been overrated”. It is said that one can be a brilliant scholar without leaving one's home base. Do you think travel is a necessary component of a quality education?" },
  { id: 4, title: "Climate Change Responsibility", question: "Climate change is a concerning global issue. Who should take the responsibilities: governments, big companies or individuals?" },
  { id: 5, title: "Television's Functions", question: "Television serves many useful functions. It helps people to relax. We can learn from television, and it can also be seen as a companion for the lonely. To what extent do you agree with this? Explain why with your own experience." },
  { id: 6, title: "Experiential Learning", question: "Some people point out that experiential learning (i.e. learning by doing) can work well in formal education. However, others think a traditional form of teaching is the best. Do you think experiential learning is beneficial in high school or college?" },
  { id: 7, title: "Late Assignment Penalties", question: "Some universities deduct students' marks if assignments are given late. What is your opinion and give your recommendations?" },
  { id: 8, title: "Combining Study and Work", question: "In order to study effectively, it requires comfort, peace and time. So it is impossible for a student to combine learning and employment at the same time, because one distracts the other. Is it realistic to combine them at the same time in our life today? Support your opinion with examples." },
  { id: 9, title: "Most Pressing Global Problem", question: "The world’s governments and organizations are facing a lot of issues. Which do you think is the most pressing problem for the inhabitants on our planet? And give solutions." },
  { id: 10, title: "Building Design Impact", question: "How does the design of buildings affect, either positively or negatively, where people work and live?" },
  { id: 11, title: "Work-Life Balance", question: "Nowadays, it is increasingly more difficult to maintain the right balance between work and other aspects of one’s life, such as time with family and leisure needs. How important do you think this balance is? Why do people find it hard to achieve?" },
  { id: 12, title: "New Invention Impact", question: "In our technological world, the number of new inventions has been evolving on a daily basis. Please describe a new invention and explain the impact, either beneficial or detrimental, that you feel it has had on society." },
  { id: 13, title: "Laws and Human Behavior", question: "Some people think human behaviors can be changed by laws, while others think laws have little effect. What is your opinion." },
  { id: 14, title: "Tourism in Developing Countries", question: "For a less developed country, the disadvantages of tourism are as great as the advantages. Please discuss this statement, and give and explain your opinion." },
  { id: 15, title: "Mass Communication Information Revolution", question: "“The information revolution by modern mass communication has both positive and negative consequences for individuals and for society.” To what extent do you agree? Explain with your own experience." },
  { id: 16, title: "Mass Media Influence", question: "The mass media, including TV, radio and newspapers, influences our society and shapes our opinions and characters. What is your opinion?" },
  { id: 17, title: "Mass Media Impact on Youth", question: "Mass media, including TV and newspapers, have a great influence on humans, particularly on the younger generation. It has a pivotal role in shaping people's opinions. Discuss the extent you agree or disagree. Use your own experience or examples." },
  { id: 18, title: "Consumer Goods Marketing", question: "Should marketing in companies producing consumer goods like food and clothing, place emphasis on the reputation of the company or short-term strategies like discounts and special offers? Why?" },
  { id: 19, title: "Climate Change Research", question: "You are given climate change as the field of study. Which area would you prefer? Explain why you pick this particular area of your study and give an example in the area you pick." },
  { id: 20, title: "Studying Classic Plays", question: "There are both problems and benefits for high school students to study plays and works of theatres written centuries ago. Discuss and use your own experience." },
  { id: 21, title: "Shopping Malls vs Local Shops", question: "In many towns and cities, large shopping malls are replacing small local shops. Do you think this is a positive development? Give your reasons and examples." },
  { id: 22, title: "Medical Technology and Life Expectancy", question: "Medical technology is responsible for increasing the average life expectancy. Do you think it is a curse or a blessing?" },
  { id: 23, title: "Parental Legal Responsibility", question: "Should parents be held legally responsible for the actions of their children? Do you agree with this opinion? Support your position with your own study, experience or observations." },
  { id: 24, title: "City vs Rural Life", question: "Living in the countryside or having a city life, which one do you prefer? Please use examples or your personal experience to support your opinion." },
  { id: 25, title: "Life Experience vs Formal Education", question: "Some people argue that experience is the best teacher. Life experiences can teach more effectively than books or formal school education. How far do you agree with this idea? Support your opinion with reasons and/or your personal experience." },
  { id: 26, title: "Digital Media vs Physical Books", question: "With the increase of digital media available online, the role of the library has become obsolete. Universities should only procure new digital media rather than constantly update textbooks. Discuss both the advantages and disadvantages of this position and give your own point of view." },
  { id: 27, title: "Public Transport vs Roads", question: "As cities are expanding, some people claim governments should look forward to creating better networks of public transport available for everyone rather than building more roads for vehicle owning population. What’s your opinion? Give some examples or experience to support." },
  { id: 28, title: "Work-Life Balance (Prevalence & Consequences)", question: "The time people devote to jobs leaves very little time for personal life. How widespread is the problem? What problem will this shortage of time cause?" },
  { id: 29, title: "Reducing Work Hours", question: "In modern society, unemployment among young people is a serious problem. One solution is to shorten the working week and put more people to work. Give your opinion of the idea, considering the advantages and disadvantages, whether it can apply to young people or the whole workforce." },
  { id: 30, title: "Celebrity Privacy", question: "People who are famous entertainers or sportspeople should give up the right to privacy because this is the price of fame. To what extent do you agree or disagree with this point of view? Give your opinion with your experiences." },
  { id: 31, title: "Future Work Hours", question: "“In the future, people will work less hours at their jobs.” To what extent do you agree with it? Please support your opinion with your own experience." },
  { id: 32, title: "Age Restrictions", question: "Age restrictions can be seen everywhere. It is believed that people should not do things until they reach the right age, such as marriage, and driving. Select one activity and state the minimum age that you think. Support with your own experiences." },
  { id: 33, title: "Foreign Language as Required Course", question: "Should schools make learning a foreign language compulsory?" },
  { id: 34, title: "Historic Buildings Preservation", question: "More and more countries spend large amounts of money on the restoration of buildings instead of on modern housing. To what extent do you agree or disagree with this analysis? Support your writing with its advantages or disadvantages." },
  { id: 35, title: "Modern Childhood", question: "It is getting harder for children to live and grow in the 21st century than in the past. Do you agree or disagree?" },
  { id: 36, title: "Maximum Wage Limits", question: "“Should there be a maximum wage for high-paying people.” To what extent do you agree with this statement? Please give your reasons and/or arguments." },
  { id: 37, title: "AI Translation vs Learning Languages", question: "Advanced technology such as artificial intelligence can translate a foreign language easily. Do you think learning a foreign language is still necessary? Support with your own experience." }
];

// Read B1 File
const b1Content = fs.readFileSync(b1FilePath, 'utf8');

// Helper to extract an essay by its current title/topic
function extractEssay(content, titleKeyword) {
  const regex = new RegExp(`## Example \\d+:.*?${titleKeyword}.*?\\n([\\s\\S]*?)(?=\\n## Example|\\n## 🟢)`, 'i');
  const match = content.match(regex);
  if (match) {
    return match[1].trim();
  }
  return null;
}

// Current B1 Mapping (based on browsing the file earlier)
// Note: We need to be careful to match the EXISTING B1 content to the NEW ID.
// This map is: New ID -> Regex Keyword to find in Old File
const essayMap = {
  1: "Employee Decision Making",
  2: "Formal Written Examinations",
  3: "Travel", // Travel and Quality Education
  4: "Climate Change Responsibility",
  5: "Television", // Television's Useful Functions
  6: "Experiential Learning",
  7: "Late Assignment Penalties",
  8: "Combining Study and Work",
  9: "Global Problem", // Most Pressing Global Problem
  10: "Building Design", // Building Design Impact
  11: "Work-Life Balance",
  12: "New Invention", // New Invention Impact
  13: "Laws and Human Behavior",
  14: "Tourism in Developing",
  15: "Mass Communication", // Mass Communication Impact
  16: "Mass Media Influence",
  17: "Mass Media Impact on Youth",
  18: "Consumer Goods", // Marketing Strategy ?? Need to check file
  19: "Climate Change Research", // Climate Change Research Area
  20: "Studying Classic Plays",
  21: "Shopping Malls",
  22: "Medical Technology",
  23: "Parental Legal Responsibility",
  24: "City vs Rural", // Countryside vs City Life
  25: "Life Experience", // Life Experience vs Formal Education
  26: "Digital Media", // Digital Media vs Libraries
  27: "Public Transport",
  28: "Time for Personal Life",
  29: "Shorter Working Week", // Reducing Work Hours
  30: "Celebrity Privacy",
  31: "Working Less Hours", // Future Work Hours
  32: "Age Restrictions",
  33: "Foreign Language", // MISSING IN B1?
  34: "Preserving Historic Buildings", // Match Historic Buildings Preservation
  35: "Modern Childhood",
  36: "Maximum Wage",
  37: "AI Translation", // AI vs Language Learning
};

// Start building new content
let newContent = b1Content.split('## Example 1:')[0]; // Keep header

// Replace the Table of Contents & Question List in the header
// We'll regenerate it fully at the end or just write the components we know.

// Rebuild TOC and Question List
let toc = "## Table of Contents\n\n0. [Template B1 (Mostly Agree)](#-template-b1-mostly-agree)\n";
let questionList = "### 📝 All Essay Questions (Content Only)\n\n";

// Rebuild Essays
let essaySection = "";

masterQuestions.forEach(q => {
  // 1. TOC Entry
  toc += `${q.id}. [Example ${q.id}: ${q.title}](#example-${q.id}-${q.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '')})\n`;

  // 2. Question List Entry
  questionList += `${q.id}. **${q.title}:** ${q.question}\n`;

  // 3. Essay Content
  let essayBody = extractEssay(b1Content, essayMap[q.id] || "NO_MATCH_XYZ");

  essaySection += `\n## Example ${q.id}: ${q.title}\n\n`;
  essaySection += `**Question:** ${q.question}\n\n`;

  if (essayBody) {
    // Strip the old Question line if it exists in the body, since we just added the canonical one
    essayBody = essayBody.replace(/^\*\*Question:\*\*.*?\n\n/i, '');
    essaySection += essayBody + "\n\n---\n";
  } else {
    essaySection += `> [!WARNING]\n> **MISSING B1 EXAMPLE**\n> This topic needs a B1 template essay.\n\n---\n`;
  }
});

// Remove old TOC (approximate lines)
newContent = newContent.replace(/## Table of Contents[\s\S]*?---/m, "## Table of Contents\n\n[[TOC_PLACEHOLDER]]\n\n---\n");
newContent = newContent.replace(/### 📝 All Essay Questions[\s\S]*?---/m, "[[QUESTION_LIST_PLACEHOLDER]]\n\n---\n");

// Replace placeholders
newContent = newContent.replace("[[TOC_PLACEHOLDER]]", toc.trim());
newContent = newContent.replace("[[QUESTION_LIST_PLACEHOLDER]]", questionList.trim());

// Append new essay section
newContent += essaySection;

// Append Part 2 (90+ Template) - Identifying start of Part 2
const part2StartRegex = /## 🟢 Part 2: 90\+ Template/;
const part2Match = b1Content.match(part2StartRegex);

if (part2Match) {
  const part2Content = b1Content.substring(part2Match.index);
  newContent += "\n" + part2Content;
}

// Write result
fs.writeFileSync(b1FilePath, newContent);
console.log("Successfully realigned B1 essays!");
