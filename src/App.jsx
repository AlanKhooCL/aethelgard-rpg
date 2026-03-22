import { useEffect, useState } from 'react';
import { fetchAethelgardData } from './api/grimoire';
import './App.css';

// The Lore and Encounters of Aethelgard
const WORLD_STAGES = [
  {
    town: "The Outpost of Oakhaven",
    boss: "The Lingering Phantom",
    reqLevel: 3,
    lore: "A fragment of ancient sorrow blocks the forest path. It requires basic magical consistency to dispel."
  },
  {
    town: "The Archive City of Spires",
    boss: "The Corrupted Golem of Knowledge",
    reqLevel: 7,
    lore: "Overloaded with centuries of data, this golem guards the bridge. You need a deeper understanding to bypass its logic."
  },
  {
    town: "The Northern Pass",
    boss: "The Frost Drake Barrier",
    reqLevel: 12,
    lore: "An absolute zero magical field left from the old wars. Only advanced spellcraft can melt this path."
  },
  {
    town: "Ende, The Final Realm",
    boss: "Aureole's Guardian",
    reqLevel: 20,
    lore: "The final test before reaching the heaven where souls rest."
  }
];

function App() {
  const [player, setPlayer] = useState({
    level: 1,
    exp: 0,
    skills: [],
    completedChaptersCount: 0,
    quests: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [stageIndex, setStageIndex] = useState(0);
  const [battleMessage, setBattleMessage] = useState("");

  // Load saved map progress and fetch sheet data
  useEffect(() => {
    const savedStage = localStorage.getItem('aethelgard_stage');
    if (savedStage) {
      setStageIndex(parseInt(savedStage, 10));
    }

    const loadData = async () => {
      const data = await fetchAethelgardData();
      setPlayer(data);
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  const handleChallengeBoss = () => {
    const currentStage = WORLD_STAGES[stageIndex];
    
    if (player.level >= currentStage.reqLevel) {
      setBattleMessage(`Victory! Your magic dismantled ${currentStage.boss}.`);
      const nextStage = stageIndex + 1;
      setStageIndex(nextStage);
      localStorage.setItem('aethelgard_stage', nextStage);
      
      // Clear the victory message after a few seconds
      setTimeout(() => setBattleMessage(""), 4000);
    } else {
      setBattleMessage(`Defeat... Your mana is too weak. You need to be Level ${currentStage.reqLevel}. Keep studying.`);
      setTimeout(() => setBattleMessage(""), 4000);
    }
  };

  const baseExpForCurrentLevel = Math.pow(player.level - 1, 2) * 100;
  const baseExpForNextLevel = Math.pow(player.level, 2) * 100;
  const expIntoCurrentLevel = player.exp - baseExpForCurrentLevel;
  const expNeededForNext = baseExpForNextLevel - baseExpForCurrentLevel;
  const progressPercentage = Math.min((expIntoCurrentLevel / expNeededForNext) * 100, 100);

  if (isLoading) {
    return <div className="loading-screen">Reading the ancient texts...</div>;
  }

  const isGameBeaten = stageIndex >= WORLD_STAGES.length;
  const currentStage = isGameBeaten ? null : WORLD_STAGES[stageIndex];

  return (
    <div className="rpg-container">
      <header className="game-header">
        <h1>Traveler of Aethelgard</h1>
        <p className="subtitle">
          Current Location: {isGameBeaten ? "The Peaceful Era" : currentStage.town}
        </p>
      </header>

      {/* NEW BOSS ENCOUNTER SECTION */}
      {!isGameBeaten && (
        <div className="boss-card">
          <div className="boss-header">
            <h2>Path Blocked: {currentStage.boss}</h2>
            <span className="boss-level">Req: LVL {currentStage.reqLevel}</span>
          </div>
          <p className="boss-lore">"{currentStage.lore}"</p>
          
          <button 
            className="challenge-btn" 
            onClick={handleChallengeBoss}
          >
            Attempt to Dispel Magic
          </button>
          
          {battleMessage && (
            <div className={`battle-message ${battleMessage.includes('Victory') ? 'victory' : 'defeat'}`}>
              {battleMessage}
            </div>
          )}
        </div>
      )}

      {isGameBeaten && (
        <div className="boss-card victory-card">
          <h2>The Journey is Complete</h2>
          <p>You have traversed Aethelgard and mastered the ancient texts. Peace is restored.</p>
        </div>
      )}

      <div className="status-card">
        <div className="level-badge">
          <span className="level-label">LVL</span>
          <span className="level-number">{player.level}</span>
        </div>

        <div className="exp-section">
          <div className="exp-labels">
            <span>EXP: {player.exp}</span>
            <span>Next: {baseExpForNextLevel}</span>
          </div>
          <div className="exp-bar-bg">
            <div className="exp-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="quests-section">
        <h2>Active Quests</h2>
        {player.quests.length > 0 ? (
          <div className="quest-groups-container">
            {player.quests.map((group, index) => (
              <div key={index} className="quest-group">
                <h3 className="course-title-header">📜 {group.courseTitle}</h3>
                <ul className="quest-list">
                  {group.chapters.map((quest, qIndex) => (
                    <li key={qIndex} className="quest-item">
                      <div className="quest-header">
                        <span className="quest-title">{quest.title}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No active quests. The realm is at peace.</p>
        )}
      </div>
    </div>
  );
}

export default App;