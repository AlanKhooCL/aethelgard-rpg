import { useEffect, useState } from 'react';
import { fetchAethelgardData } from './api/grimoire';
import './App.css';

const WORLD_STAGES = [
  { town: "The Outpost of Oakhaven", boss: "The Lingering Phantom", reqLevel: 3, lore: "A fragment of ancient sorrow blocks the forest path. It requires basic magical consistency to dispel." },
  { town: "The Archive City of Spires", boss: "The Corrupted Golem of Knowledge", reqLevel: 7, lore: "Overloaded with centuries of data, this golem guards the bridge. You need a deeper understanding to bypass its logic." },
  { town: "The Northern Pass", boss: "The Frost Drake Barrier", reqLevel: 12, lore: "An absolute zero magical field left from the old wars. Only advanced spellcraft can melt this path." },
  { town: "Ende, The Final Realm", boss: "Aureole's Guardian", reqLevel: 20, lore: "The final test before reaching the heaven where souls rest." }
];

// Emojis representing the magical runes you must match
const SPELL_RUNES = ['🔮', '📜', '⚔️', '🛡️', '🌿', '💎', '🌙', '✨'];

function App() {
  const [player, setPlayer] = useState({ level: 1, exp: 0, skills: [], completedChaptersCount: 0, quests: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [stageIndex, setStageIndex] = useState(0);
  const [battleMessage, setBattleMessage] = useState("");
  const [equippedSkills, setEquippedSkills] = useState([]);
  const [restMessage, setRestMessage] = useState("");

  // --- MINI GAME STATES ---
  const [isBattling, setIsBattling] = useState(false);
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameStatus, setGameStatus] = useState('idle'); // idle, playing, won, lost

  useEffect(() => {
    const savedStage = localStorage.getItem('aethelgard_stage');
    if (savedStage) setStageIndex(parseInt(savedStage, 10));

    const savedSkills = localStorage.getItem('aethelgard_equipped');
    if (savedSkills) setEquippedSkills(JSON.parse(savedSkills));

    const loadData = async () => {
      const data = await fetchAethelgardData();
      setPlayer(data);
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('aethelgard_equipped', JSON.stringify(equippedSkills));
  }, [equippedSkills]);

  const effectiveLevel = player.level + equippedSkills.length;

  // --- BATTLE LOGIC ---
  const startBattle = () => {
    const currentStage = WORLD_STAGES[stageIndex];
    const diff = currentStage.reqLevel - effectiveLevel;
    const isUnderleveled = diff > 0;

    // Scaling difficulty based on effective level
    const numPairs = isUnderleveled ? 8 : 6;
    const initialTime = isUnderleveled ? Math.max(15, 45 - (diff * 5)) : 60;

    // Generate and shuffle the deck
    const selectedRunes = SPELL_RUNES.slice(0, numPairs);
    const deck = [...selectedRunes, ...selectedRunes]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({ id: idx, emoji, isFlipped: false, isMatched: false }));

    setCards(deck);
    setTimeLeft(initialTime);
    setGameStatus('playing');
    setFlippedIndices([]);
    setIsBattling(true);
  };

  const handleCardClick = (index) => {
    if (gameStatus !== 'playing') return;
    if (flippedIndices.length === 2) return; // Prevent clicking too fast
    if (cards[index].isFlipped || cards[index].isMatched) return;

    const newIndices = [...flippedIndices, index];
    setFlippedIndices(newIndices);

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    // Check for a match
    if (newIndices.length === 2) {
      const [firstIndex, secondIndex] = newIndices;
      if (newCards[firstIndex].emoji === newCards[secondIndex].emoji) {
        newCards[firstIndex].isMatched = true;
        newCards[secondIndex].isMatched = true;
        setCards(newCards);
        setFlippedIndices([]);

        // Check for victory
        if (newCards.every(c => c.isMatched)) {
          setGameStatus('won');
          handleWin();
        }
      } else {
        // No match, flip back after a short delay
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[firstIndex].isFlipped = false;
          resetCards[secondIndex].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 800);
      }
    }
  };

  // Timer Countdown
  useEffect(() => {
    if (isBattling && gameStatus === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameStatus === 'playing') {
      setGameStatus('lost');
      setTimeout(() => closeBattle("Defeat... You lost your focus. Rest and try again."), 2000);
    }
  }, [timeLeft, isBattling, gameStatus]);

  const handleWin = () => {
    const currentStage = WORLD_STAGES[stageIndex];
    const nextStage = stageIndex + 1;
    setStageIndex(nextStage);
    localStorage.setItem('aethelgard_stage', nextStage);
    setTimeout(() => closeBattle(`Victory! Your magic dismantled ${currentStage.boss}.`), 2000);
  };

  const closeBattle = (message) => {
    setIsBattling(false);
    if (message) {
      setBattleMessage(message);
      setTimeout(() => setBattleMessage(""), 4000);
    }
  };

  // --- GENERAL LOGIC ---
  const toggleEquipSkill = (skill) => {
    if (equippedSkills.includes(skill)) {
      setEquippedSkills(equippedSkills.filter(s => s !== skill));
    } else if (equippedSkills.length < 3) {
      setEquippedSkills([...equippedSkills, skill]);
    } else {
      setBattleMessage("You can only equip 3 spells at a time.");
      setTimeout(() => setBattleMessage(""), 3000);
    }
  };

  const handleRestAtInn = () => {
    setEquippedSkills([]);
    setRestMessage("You slept in late. Your mind is clear and your magic is reset.");
    setTimeout(() => setRestMessage(""), 4000);
  };

  const baseExpForCurrentLevel = Math.pow(player.level - 1, 2) * 100;
  const baseExpForNextLevel = Math.pow(player.level, 2) * 100;
  const progressPercentage = Math.min(((player.exp - baseExpForCurrentLevel) / (baseExpForNextLevel - baseExpForCurrentLevel)) * 100, 100);

  if (isLoading) return <div className="loading-screen">Reading the ancient texts...</div>;

  const isGameBeaten = stageIndex >= WORLD_STAGES.length;
  const currentStage = isGameBeaten ? null : WORLD_STAGES[stageIndex];

  return (
    <div className="rpg-container">
      {/* --- BATTLE OVERLAY MODAL --- */}
      {isBattling && (
        <div className="battle-overlay">
          <div className="battle-modal">
            <div className="battle-stats">
              <span>Time: <strong style={{ color: timeLeft <= 5 ? '#ff9999' : 'inherit' }}>{timeLeft}s</strong></span>
              <button className="flee-btn" onClick={() => closeBattle("You fled the encounter.")}>Flee</button>
            </div>
            
            {gameStatus === 'won' && <h2 className="battle-result victory">Magic Dispelled!</h2>}
            {gameStatus === 'lost' && <h2 className="battle-result defeat">Focus Broken!</h2>}

            <div className={`battle-grid pairs-${cards.length / 2}`}>
              {cards.map((card, index) => (
                <div 
                  key={card.id} 
                  className={`battle-card ${card.isFlipped || card.isMatched ? 'flipped' : ''}`}
                  onClick={() => handleCardClick(index)}
                >
                  <div className="card-inner">
                    <div className="card-front">{card.emoji}</div>
                    <div className="card-back"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="game-header">
        <h1>Traveler of Aethelgard</h1>
        <p className="subtitle">Location: {isGameBeaten ? "The Peaceful Era" : currentStage.town}</p>
      </header>

      <div className="journey-map">
        <div className="map-line">
          <div className="map-progress-fill" style={{ width: `${(stageIndex / (WORLD_STAGES.length - 1)) * 100}%` }}></div>
        </div>
        <div className="map-nodes">
          {WORLD_STAGES.map((stage, i) => {
            const isCompleted = i < stageIndex;
            const isCurrent = i === stageIndex;
            return (
              <div key={i} className={`map-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`} title={stage.town}>
                {isCompleted ? '✓' : isCurrent ? '🚶' : '•'}
              </div>
            );
          })}
        </div>
        <div className="map-labels">
          <span className="start-label">{WORLD_STAGES[0].town.split(' ')[2]}</span>
          <span className="end-label">Ende</span>
        </div>
      </div>

      {!isGameBeaten && (
        <div className="boss-card">
          <div className="boss-header">
            <h2>BOSS ALERT: {currentStage.boss}</h2>
            <span className="boss-level">Req: LVL {currentStage.reqLevel}</span>
          </div>
          <p className="boss-lore">"{currentStage.lore}"</p>
          <button className="challenge-btn" onClick={startBattle}>Attempt to Dispel Magic</button>
          {battleMessage && (
            <div className={`battle-message ${battleMessage.includes('Victory') ? 'victory' : 'defeat'}`}>{battleMessage}</div>
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
        <div className="character-profile">
          <div className="character-portrait">
            <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=Aethelgard&backgroundColor=transparent" alt="Character Portrait" />
          </div>
          
          <div className="profile-details">
            <div className="level-badge">
              <span className="level-label">LVL</span>
              <span className="level-number">{player.level}</span>
              {equippedSkills.length > 0 && <span className="level-boost">+{equippedSkills.length}</span>}
            </div>
            
            <a 
              href="https://alankhoocl.github.io/AI-Learning-Management/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="train-btn"
            >
              ✨ Go Train
            </a>
          </div>
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

      <div className="equipped-section">
        <div className="equipped-header-row">
          <h2>Prepared Magic ({equippedSkills.length}/3)</h2>
          <button className="inn-btn" onClick={handleRestAtInn}>🛌 Rest at Inn</button>
        </div>
        
        {restMessage && <div className="inn-message">{restMessage}</div>}

        <div className="equipped-slots">
          {[0, 1, 2].map(slotIndex => (
            <div key={slotIndex} className={`spell-slot ${equippedSkills[slotIndex] ? 'filled' : 'empty'}`}>
              {equippedSkills[slotIndex] ? `✨ ${equippedSkills[slotIndex]}` : 'Empty Slot'}
            </div>
          ))}
        </div>
      </div>

      <div className="skills-section">
        <h2>Grimoire of Skills (Tap to Equip)</h2>
        {player.skills.length > 0 ? (
          <ul className="skills-list interactable">
            {player.skills.map((skill, index) => {
              const isEquipped = equippedSkills.includes(skill);
              return (
                <li key={index} className={`skill-item ${isEquipped ? 'equipped-item' : ''}`} onClick={() => toggleEquipSkill(skill)}>
                  <span className="skill-icon">{isEquipped ? '🔮' : '📖'}</span>
                  {skill}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty-state">Your grimoire is empty. Complete a Course to unlock magic.</p>
        )}
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
          <p className="empty-state">No active quests.</p>
        )}
      </div>
    </div>
  );
}

export default App;