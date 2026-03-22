// src/api/grimoire.js

// You will need to paste the specific CSV links for each tab here
const COURSES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQyJt1-czMGR07O9Fsst0D1unBf0JqjTTA2YFbAXR2yKVz2ggcpEkKoqSoA0Medu-_QmHuXK_AX7nQQ/pub?gid=0&single=true&output=csv";
const CHAPTERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQyJt1-czMGR07O9Fsst0D1unBf0JqjTTA2YFbAXR2yKVz2ggcpEkKoqSoA0Medu-_QmHuXK_AX7nQQ/pub?gid=1488260885&single=true&output=csv";

export const fetchAethelgardData = async () => {
  try {
    const [coursesRes, chaptersRes] = await Promise.all([
      fetch(COURSES_CSV_URL),
      fetch(CHAPTERS_CSV_URL)
    ]);

    if (!coursesRes.ok || !chaptersRes.ok) throw new Error("Failed to read the ancient texts.");

    const coursesText = await coursesRes.text();
    const chaptersText = await chaptersRes.text();

    const courses = parseCSV(coursesText);
    const chapters = parseCSV(chaptersText);

    return calculatePlayerStats(courses, chapters);
  } catch (error) {
    console.error("Magic interference detected:", error);
    return { level: 1, exp: 0, skills: [], completedChaptersCount: 0, quests: [] }; 
  }
};

const calculatePlayerStats = (courses, chapters) => {
  let totalExp = 0;
  const unlockedSkills = [];
  
  // Create a dictionary to easily look up Course Titles by CourseID
  const courseDict = {};
  courses.forEach(course => {
    courseDict[course.CourseID] = course['Course Title'] || "Unknown Grimoire Section";
  });

  const questsByCourse = {};

  // 1. Calculate Chapter EXP & Group Active Quests
  const completedChapters = chapters.filter(ch => {
    const status = ch.IsCompleted ? ch.IsCompleted.toLowerCase().trim() : '';
    const isDone = status === 'true' || status === 'yes' || status === '1';
    
    // Group incomplete chapters by their Course Title
    if (!isDone && ch['Chapter Title']) {
      const cId = ch.CourseID;
      const courseTitle = courseDict[cId] || "Uncharted Territory";
      
      if (!questsByCourse[courseTitle]) {
        questsByCourse[courseTitle] = [];
      }
      
      questsByCourse[courseTitle].push({
        title: ch['Chapter Title'],
        summary: ch.Summary || "A mysterious task awaits.",
        minutes: ch.Minutes || "??"
      });
    }
    
    return isDone;
  });
  
  totalExp += (completedChapters.length * 50);

  // 2. Calculate Course EXP & Unlocks
  courses.forEach(course => {
    const chaptersFinishedForThisCourse = completedChapters.filter(
      ch => ch.CourseID === course.CourseID
    ).length;

    const totalRequired = parseInt(course['Total Chapters']) || 0;
    
    if (totalRequired > 0 && chaptersFinishedForThisCourse >= totalRequired) {
      totalExp += 500; 
      if (course['Skills Acquired']) {
        unlockedSkills.push(course['Skills Acquired']);
      }
    }
  });

  // Convert the grouped object into an array so React can render it easily
  const groupedQuestsArray = Object.keys(questsByCourse).map(title => ({
    courseTitle: title,
    chapters: questsByCourse[title]
  }));

  // 3. The Leveling Formula
  const currentLevel = Math.floor(Math.sqrt(totalExp / 100)) + 1;

  return { 
    level: currentLevel, 
    exp: totalExp, 
    skills: unlockedSkills,
    completedChaptersCount: completedChapters.length,
    quests: groupedQuestsArray
  };
};

const parseCSV = (csvText) => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].split(',');
    if (currentLine.length <= 1) continue; 
    
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentLine[j] ? currentLine[j].trim() : "";
    }
    results.push(obj);
  }
  return results;
};