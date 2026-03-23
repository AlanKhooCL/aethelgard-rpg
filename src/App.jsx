import { useEffect, useState } from 'react';
import { fetchAethelgardData } from './api/grimoire';
import './App.css';

// --- THE PROCEDURAL GENERATION ENGINE ---
const ADJECTIVES = ["Lingering", "Corrupted", "Frost", "Shadow", "Crimson", "Void", "Astral", "Silent", "Iron", "Ethereal", "Shattered", "Luminous"];
const NOUNS = ["Phantom", "Golem", "Drake", "Wraith", "Titan", "Behemoth", "Specter", "Guardian", "Warlock", "Chimera", "Leviathan", "Archon"];
const PLACES = ["Oakhaven", "Spires", "the Northern Pass", "Ende", "the Abyss", "the Sunken City", "the Floating Isles", "the Crystal Wastes", "the Whispering Woods", "the Ashen Peaks"];

const getStageInfo = (index) => {
  // We use the index to deterministically pick words, so the boss doesn't change if you refresh
  const adj = ADJECTIVES[index % ADJECTIVES.length];
  const noun = NOUNS[(index * 3) % NOUNS.length];
  const place = PLACES[(index * 7) % PLACES.length];
  return {
    town: `Region of ${place}`,
    boss: `The ${adj} ${noun}`,
    reqLevel: 3 + (index * 4), // The level requirement scales up infinitely by 4 each stage
    lore: `An ancient anomaly of Tier ${index + 1} blocks the path. Defeat it to advance deeper into the unknown.`
  };
};

const SPELL_RUNES = ['🔮', '📜', '⚔️', '🛡️', '🌿', '💎', '🌙', '✨'];

function App() {
  const [player, setPlayer] = useState({ level: 1, exp: 0, skills: [], completedChaptersCount: 0, quests: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [stageIndex, setStageIndex] = useState(0);
  const [battleMessage, setBattleMessage] = useState("");
  const [equippedSkills, setEquippedSkills] = useState([]);
  const [restMessage, setRestMessage] = useState("");

  // --- BATTLE & MINI-GAME STATES ---
  const [isBattling, setIsBattling] = useState(false);
  const [battleType, setBattleType] = useState('memory'); // 'memory' or 'sequence'
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameStatus, setGameStatus] = useState('idle'); // idle, playing, won, lost

  // Memory Game State
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);

  // Sequence Game State
  const [sequence, setSequence] = useState([]);
  const [playerSequence, setPlayerSequence] = useState([]);
  const [sequencePhase, setSequencePhase] = useState('showing'); // 'showing' or 'input'

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
  const currentStage = getStageInfo(stageIndex);

  // --- START THE RANDOMIZED BATTLE ---
  const startBattle = () => {
    const diff = currentStage.reqLevel - effectiveLevel;
    const isUnderleveled = diff > 0;
    
    // 50/50 chance to get either mini-game
    const chosenGame = Math.random() > 0.5 ? 'memory' : 'sequence';
    setBattleType(chosenGame);
    setGameStatus('playing');
    setIsBattling(true);

    if (chosenGame === 'memory') {
      const numPairs = isUnderleveled ? 8 : 6;
      const initialTime = isUnderleveled ? Math.max(15, 45 - (diff * 5)) : 60;
      
      const selectedRunes = SPELL_RUNES.slice(0, numPairs);
      const deck = [...selectedRunes, ...selectedRunes]
        .sort(() => Math.random() - 0.5)
        .map((emoji, idx) => ({ id: idx, emoji, isFlipped: false, isMatched: false }));

      setCards(deck);
      setFlippedIndices([]);
      setTimeLeft(initialTime);
    } else {
      // Setup Sequence Game
      const seqLength = isUnderleveled ? 6 : 4;
      const initialTime = isUnderleveled ? Math.max(10, 20 - diff) : 30; // Time to input
      
      const newSeq = Array.from({length: seqLength}, () => SPELL_RUNES[Math.floor(Math.random() * SPELL_RUNES.length)]);
      setSequence(newSeq);
      setPlayerSequence([]);
      setSequencePhase('showing');
      setTimeLeft(initialTime);

      // Give player 3 seconds to memorize the sequence before hiding it
      setTimeout(() => {
        if (isBattling) setSequencePhase('input');
      }, 3000);
    }
  };

  // --- MEMORY GAME LOGIC ---
  const handleCardClick = (index) => {
    if (battleType !== 'memory' || gameStatus !== 'playing') return;
    if (flippedIndices.length === 2 || cards[index].isFlipped || cards[index].isMatched) return;

    const newIndices = [...flippedIndices, index];
    setFlippedIndices(newIndices);

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    if (newIndices.length === 2) {
      const [firstIndex, secondIndex] = newIndices;
      if (newCards[firstIndex].emoji === newCards[secondIndex].emoji) {
        newCards[firstIndex].isMatched = true;
        newCards[secondIndex].isMatched = true;
        setCards(newCards);
        setFlippedIndices([]);

        if (newCards.every(c => c.isMatched)) {
          setGameStatus('won');
          handleWin();
        }
      } else {
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

  // --- SEQUENCE GAME LOGIC ---
  const handleRuneClick = (rune) => {
    if (battleType !== 'sequence' || sequencePhase !== 'input' || gameStatus !== 'playing') return;
    
    const newPlayerSeq = [...playerSequence, rune];
    setPlayerSequence(newPlayerSeq);
    
    const currentIndex = newPlayerSeq.length - 1;
    
    // Check if the rune casted was wrong
    if (newPlayerSeq[currentIndex] !== sequence[currentIndex]) {
      setGameStatus('lost');
      setTimeout(() => closeBattle("Defeat... You cast the wrong rune."), 2000);
      return;
    }
    
    // Check if the whole sequence is complete
    if (newPlayerSeq.length === sequence.length) {
      setGameStatus('won');
      handleWin();
    }
  };

  // Timer logic for both games
  useEffect(() => {
    if (isBattling && gameStatus === 'playing' && timeLeft > 0) {
      // If sequence game is in 'showing' phase, freeze the timer
      if (battleType === 'sequence' && sequencePhase === 'showing') return;
      
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameStatus === 'playing') {
      setGameStatus('lost');
      setTimeout(() => closeBattle("Defeat... You lost your focus. Rest and try again."), 2000);
    }
  }, [timeLeft, isBattling, gameStatus, battleType, sequencePhase]);

  const handleWin = () => {
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

  // Generate an endless map view showing the previous, current, and next 2 stages
  const mapNodes = [];
  for (let i = Math.max(0, stageIndex - 1); i <= stageIndex + 2; i++) {
    mapNodes.push(i);
  }

  return (
    <div className="rpg-container">
      
      {/* --- MULTI-GAME BATTLE OVERLAY --- */}
      {isBattling && (
        <div className="battle-overlay">
          <div className="battle-modal">
            <div className="battle-stats">
              <span>Time: <strong style={{ color: timeLeft <= 5 ? '#ff9999' : 'inherit' }}>{timeLeft}s</strong></span>
              <button className="flee-btn" onClick={() => closeBattle("You fled the encounter.")}>Flee</button>
            </div>
            
            {gameStatus === 'won' && <h2 className="battle-result victory">Magic Dispelled!</h2>}
            {gameStatus === 'lost' && <h2 className="battle-result defeat">Focus Broken!</h2>}

            {battleType === 'memory' ? (
              <div className={`battle-grid pairs-${cards.length / 2}`}>
                {cards.map((card, index) => (
                  <div key={card.id} className={`battle-card ${card.isFlipped || card.isMatched ? 'flipped' : ''}`} onClick={() => handleCardClick(index)}>
                    <div className="card-inner">
                      <div className="card-front">{card.emoji}</div>
                      <div className="card-back"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sequence-game">
                <h3 className="sequence-instruction">
                  {sequencePhase === 'showing' ? 'Memorize the Spell!' : 'Cast the Runes!'}
                </h3>
                <div className="sequence-display">
                  {sequence.map((rune, idx) => (
                    <div key={idx} className={`sequence-slot ${playerSequence.length > idx ? 'filled' : ''}`}>
                      {sequencePhase === 'showing' ? rune : (playerSequence[idx] || '?')}
                    </div>
                  ))}
                </div>
                {sequencePhase === 'input' && (
                  <div className="sequence-keypad">
                    {SPELL_RUNES.map(rune => (
                      <button key={rune} className="rune-btn" onClick={() => handleRuneClick(rune)}>
                        {rune}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <header className="game-header">
        <h1>Traveler of Aethelgard</h1>
        <p className="subtitle">Location: {currentStage.town}</p>
      </header>

      {/* --- ENDLESS SCROLLING MAP --- */}
      <div className="journey-map endless-map">
        <div className="map-line"></div>
        <div className="map-nodes">
          {mapNodes.map((nodeIndex) => {
            const isCompleted = nodeIndex < stageIndex;
            const isCurrent = nodeIndex === stageIndex;
            return (
              <div key={nodeIndex} className="map-node-container">
                <div className={`map-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                  {isCompleted ? '✓' : isCurrent ? '🚶' : '•'}
                </div>
                <span className="map-node-label">Tier {nodeIndex + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

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
            
            <a href="https://alankhoocl.github.io/AI-Learning-Management/" target="_blank" rel="noopener noreferrer" className="train-btn">
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
