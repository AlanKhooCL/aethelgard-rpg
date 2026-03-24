import { useEffect, useState } from 'react';
import { fetchAethelgardData } from './api/grimoire';
import './App.css';

const ADJECTIVES = ["Lingering", "Corrupted", "Frost", "Shadow", "Crimson", "Void", "Astral", "Silent", "Iron", "Ethereal", "Shattered", "Luminous"];
const NOUNS = ["Phantom", "Golem", "Drake", "Wraith", "Titan", "Behemoth", "Specter", "Guardian", "Warlock", "Chimera", "Leviathan", "Archon"];
const PLACES = ["Oakhaven", "Spires", "the Northern Pass", "Ende", "the Abyss", "the Sunken City", "the Floating Isles", "the Crystal Wastes", "the Whispering Woods", "the Ashen Peaks"];

const getStageInfo = (index) => {
  const adj = ADJECTIVES[index % ADJECTIVES.length];
  const noun = NOUNS[(index * 3) % NOUNS.length];
  const place = PLACES[(index * 7) % PLACES.length];
  return {
    town: `Region of ${place}`,
    boss: `The ${adj} ${noun}`,
    reqLevel: 3 + (index * 4),
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

  // --- BATTLE, MINI-GAME & CINEMATIC STATES ---
  const [isBattling, setIsBattling] = useState(false);
  const [battleType, setBattleType] = useState('memory');
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameStatus, setGameStatus] = useState('idle');
  
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  
  const [sequence, setSequence] = useState([]);
  const [playerSequence, setPlayerSequence] = useState([]);
  const [sequencePhase, setSequencePhase] = useState('showing');
  
  const [runeFeedback, setRuneFeedback] = useState(null); // { rune: '🔮', status: 'correct' | 'wrong' }
  const [isResting, setIsResting] = useState(false);
  const [isVictoryFlashing, setIsVictoryFlashing] = useState(false);

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

  const startBattle = () => {
    const diff = currentStage.reqLevel - effectiveLevel;
    const isUnderleveled = diff > 0;
    
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
      const seqLength = isUnderleveled ? 6 : 4;
      const initialTime = isUnderleveled ? Math.max(10, 20 - diff) : 30;
      
      const newSeq = Array.from({length: seqLength}, () => SPELL_RUNES[Math.floor(Math.random() * SPELL_RUNES.length)]);
      setSequence(newSeq);
      setPlayerSequence([]);
      setSequencePhase('showing');
      setTimeLeft(initialTime);

      setTimeout(() => {
        if (isBattling) setSequencePhase('input');
      }, 3000);
    }
  };

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

  const handleRuneClick = (rune) => {
    if (battleType !== 'sequence' || sequencePhase !== 'input' || gameStatus !== 'playing') return;
    
    const newPlayerSeq = [...playerSequence, rune];
    setPlayerSequence(newPlayerSeq);
    const currentIndex = newPlayerSeq.length - 1;
    
    if (newPlayerSeq[currentIndex] !== sequence[currentIndex]) {
      setRuneFeedback({ rune, status: 'wrong' });
      setGameStatus('lost');
      setTimeout(() => closeBattle("Defeat... You cast the wrong rune."), 2000);
      return;
    }
    
    setRuneFeedback({ rune, status: 'correct' });
    setTimeout(() => setRuneFeedback(null), 300);

    if (newPlayerSeq.length === sequence.length) {
      setGameStatus('won');
      handleWin();
    }
  };

  useEffect(() => {
    if (isBattling && gameStatus === 'playing' && timeLeft > 0) {
      if (battleType === 'sequence' && sequencePhase === 'showing') return;
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameStatus === 'playing') {
      setGameStatus('lost');
      setTimeout(() => closeBattle("Defeat... You lost your focus. Rest and try again."), 2000);
    }
  }, [timeLeft, isBattling, gameStatus, battleType, sequencePhase]);

  const handleWin = () => {
    setIsVictoryFlashing(true);
    setTimeout(() => {
      const nextStage = stageIndex + 1;
      setStageIndex(nextStage);
      localStorage.setItem('aethelgard_stage', nextStage);
      setIsVictoryFlashing(false);
      closeBattle(`Victory! Your magic dismantled ${currentStage.boss}.`);
    }, 1200);
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
    setIsResting(true);
    setTimeout(() => {
      setEquippedSkills([]);
      setRestMessage("The night passes... Your mind is clear and your magic is reset.");
      setIsResting(false);
    }, 1500);
    setTimeout(() => setRestMessage(""), 5500);
  };

  const baseExpForCurrentLevel = Math.pow(player.level - 1, 2) * 100;
  const baseExpForNextLevel = Math.pow(player.level, 2) * 100;
  const progressPercentage = Math.min(((player.exp - baseExpForCurrentLevel) / (baseExpForNextLevel - baseExpForCurrentLevel)) * 100, 100);

  if (isLoading) return <div className="loading-screen">Reading the ancient texts...</div>;

  const mapNodes = [];
  for (let i = Math.max(0, stageIndex - 1); i <= stageIndex + 2; i++) {
    mapNodes.push(i);
  }

  return (
    <div className="rpg-container">
      
      {/* CINEMATIC OVERLAYS */}
      {isResting && <div className="fade-to-black-overlay"></div>}
      {isVictoryFlashing && <div className="victory-flash-overlay"></div>}

      {isBattling && (
        <div className="battle-overlay">
          <div className="battle-modal">
            <div className="battle-stats">
              <span className={`timer ${timeLeft <= 5 ? 'panic' : timeLeft <= 15 ? 'warning' : ''}`}>
                ⏳ {timeLeft}s
              </span>
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
                    {SPELL_RUNES.map(rune => {
                      const feedbackClass = runeFeedback?.rune === rune ? `feedback-${runeFeedback.status}` : '';
                      return (
                        <button key={rune} className={`rune-btn ${feedbackClass}`} onClick={() => handleRuneClick(rune)}>
                          {rune}
                        </button>
                      );
                    })}
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

      <div className="journey-map endless-map">
        <div className="map-line"></div>
        <div className="map-nodes">
          {mapNodes.map((nodeIndex) => {
            const isCompleted = nodeIndex < stageIndex;
            const isCurrent = nodeIndex === stageIndex;
            return (
              <div key={nodeIndex} className="map-node-container" title={`Tier ${nodeIndex + 1}`}>
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
          <h2 className="boss-name">BOSS ALERT: {currentStage.boss}</h2>
          <span className="boss-level">Req: LVL {currentStage.reqLevel}</span>
        </div>
        <p className="boss-lore">"{currentStage.lore}"</p>
        <button className="challenge-btn" onClick={startBattle}>Engage the Anomaly</button>
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
            <div key={slotIndex} className={`spell-slot spell-card ${equippedSkills[slotIndex] ? 'filled' : 'empty'}`}>
              {equippedSkills[slotIndex] ? (
                <>
                  <span className="spell-icon">✨</span>
                  <span className="spell-name">{equippedSkills[slotIndex]}</span>
                </>
              ) : 'Empty Slot'}
            </div>
          ))}
        </div>
      </div>

      <div className="skills-section">
        <h2>Grimoire of Skills</h2>
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
