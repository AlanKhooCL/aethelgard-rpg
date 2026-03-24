import { useEffect, useState, useRef } from 'react';
import { fetchAethelgardData } from './api/grimoire';
import './App.css';

// --- ENDLESS WORLD DATA ---
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
    lore: `An ancient anomaly blocks the path. Your stats must exceed its power.`
  };
};

// --- DIGIVICE EVOLUTION STAGES ---
const getCharacterEvolution = (level) => {
  if (level < 5) return { stage: "In-Training", sprite: "🌱", title: "Mana Sprout" };
  if (level < 10) return { stage: "Rookie", sprite: "🧚", title: "Forest Sprite" };
  if (level < 15) return { stage: "Champion", sprite: "🧙", title: "Adept Caster" };
  if (level < 20) return { stage: "Ultimate", sprite: "🧝", title: "High Elf" };
  return { stage: "Mega", sprite: "👼", title: "Ascended Archon" };
};

function App() {
  const [player, setPlayer] = useState({ level: 1, exp: 0, skills: [], completedChaptersCount: 0, quests: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [stageIndex, setStageIndex] = useState(0);
  const [battleMessage, setBattleMessage] = useState("");
  const [equippedSkills, setEquippedSkills] = useState([]);
  const [restMessage, setRestMessage] = useState("");

  // --- AUTO-BATTLER STATES ---
  const [isBattling, setIsBattling] = useState(false);
  const [combatStatus, setCombatStatus] = useState('idle'); // idle, fighting, won, lost
  const [playerHp, setPlayerHp] = useState(0);
  const [maxPlayerHp, setMaxPlayerHp] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [maxBossHp, setMaxBossHp] = useState(0);
  const [combatLog, setCombatLog] = useState([]);
  
  const logContainerRef = useRef(null);

  // Load Data
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

  // Save equipped skills
  useEffect(() => {
    localStorage.setItem('aethelgard_equipped', JSON.stringify(equippedSkills));
  }, [equippedSkills]);

  // Auto-scroll combat log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [combatLog]);

  const effectiveLevel = player.level + equippedSkills.length;
  const currentStage = getStageInfo(stageIndex);
  const character = getCharacterEvolution(effectiveLevel);

  // --- COMBAT INITIALIZATION ---
  const startBattle = () => {
    const pMaxHp = effectiveLevel * 25 + 50;
    const bMaxHp = currentStage.reqLevel * 30 + 50;
    
    setMaxPlayerHp(pMaxHp);
    setPlayerHp(pMaxHp);
    setMaxBossHp(bMaxHp);
    setBossHp(bMaxHp);
    
    setCombatLog([`You engaged ${currentStage.boss}!`, `Your Level: ${effectiveLevel} vs Boss Level: ${currentStage.reqLevel}`]);
    setCombatStatus('fighting');
    setIsBattling(true);
  };

  // --- AUTO-BATTLER TURN LOOP ---
  useEffect(() => {
    if (combatStatus !== 'fighting') return;

    const timer = setTimeout(() => {
      // 1. Calculate Player Damage
      const basePlayerDmg = effectiveLevel * 5 + (equippedSkills.length * 8);
      const playerDmg = Math.floor(basePlayerDmg + Math.random() * 10);
      const newBossHp = Math.max(0, bossHp - playerDmg);

      // 2. Calculate Boss Damage
      const baseBossDmg = currentStage.reqLevel * 6;
      const bossDmg = Math.floor(baseBossDmg + Math.random() * 15);
      const newPlayerHp = Math.max(0, playerHp - bossDmg);

      // 3. Update State
      setBossHp(newBossHp);
      
      // If boss dies before it hits back
      if (newBossHp <= 0) {
        setCombatLog(prev => [...prev, `💥 You dealt ${playerDmg} DMG!`, `🏆 ${currentStage.boss} has been defeated!`]);
        setCombatStatus('won');
        setTimeout(() => handleWin(), 2500);
        return;
      }

      setPlayerHp(newPlayerHp);
      
      // Update Log for full exchange
      setCombatLog(prev => [
        ...prev, 
        `⚔️ You strike for ${playerDmg} DMG!`, 
        `🩸 Boss hits back for ${bossDmg} DMG!`
      ]);

      // If player dies
      if (newPlayerHp <= 0) {
        setCombatStatus('lost');
        setTimeout(() => closeBattle("Your character fainted. You need to train and level up more!"), 3000);
      }

    }, 1200); // Trade blows every 1.2 seconds

    return () => clearTimeout(timer);
  }, [combatStatus, playerHp, bossHp, effectiveLevel, currentStage, equippedSkills]);

  const handleWin = () => {
    const nextStage = stageIndex + 1;
    setStageIndex(nextStage);
    localStorage.setItem('aethelgard_stage', nextStage);
    closeBattle(`Victory! You advance deeper into the unknown.`);
  };

  const closeBattle = (message) => {
    setIsBattling(false);
    if (message) {
      setBattleMessage(message);
      setTimeout(() => setBattleMessage(""), 4000);
    }
  };

  // --- GENERAL ACTIONS ---
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
    setRestMessage("Your companion rested. Magic capacity reset.");
    setTimeout(() => setRestMessage(""), 4000);
  };

  const baseExpForCurrentLevel = Math.pow(player.level - 1, 2) * 100;
  const baseExpForNextLevel = Math.pow(player.level, 2) * 100;
  const progressPercentage = Math.min(((player.exp - baseExpForCurrentLevel) / (baseExpForNextLevel - baseExpForCurrentLevel)) * 100, 100);

  if (isLoading) return <div className="loading-screen">Booting Digivice...</div>;

  const mapNodes = [];
  for (let i = Math.max(0, stageIndex - 1); i <= stageIndex + 2; i++) {
    mapNodes.push(i);
  }

  return (
    <div className="rpg-container">
      
      {/* --- AUTO-BATTLER MODAL --- */}
      {isBattling && (
        <div className="battle-overlay">
          <div className="battle-modal digivice-battle">
            <h2 className="battle-title">COMBAT ENGAGED</h2>
            
            <div className="health-bar-container">
              <div className="hp-header">
                <span>{character.title}</span>
                <span>{playerHp} / {maxPlayerHp} HP</span>
              </div>
              <div className="hp-track">
                <div className="hp-fill player-hp" style={{ width: `${(playerHp / maxPlayerHp) * 100}%` }}></div>
              </div>
            </div>

            <div className="battle-sprites">
              <div className={`battle-sprite ${combatStatus === 'fighting' ? 'attacking-left' : ''}`}>{character.sprite}</div>
              <div className="vs-badge">VS</div>
              <div className={`battle-sprite boss-sprite ${combatStatus === 'fighting' ? 'attacking-right' : ''}`}>👹</div>
            </div>

            <div className="health-bar-container">
              <div className="hp-header boss-header-text">
                <span>{currentStage.boss}</span>
                <span>{bossHp} / {maxBossHp} HP</span>
              </div>
              <div className="hp-track">
                <div className="hp-fill boss-hp" style={{ width: `${(bossHp / maxBossHp) * 100}%` }}></div>
              </div>
            </div>

            <div className="combat-log" ref={logContainerRef}>
              {combatLog.map((log, index) => (
                <div key={index} className={`log-entry ${log.includes('You strike') ? 'log-player' : log.includes('Boss hits') ? 'log-boss' : 'log-system'}`}>
                  {log}
                </div>
              ))}
            </div>

            {combatStatus === 'won' && <div className="battle-result victory">ENEMY DEFEATED!</div>}
            {combatStatus === 'lost' && <div className="battle-result defeat">YOU FAINTED!</div>}
            
            {combatStatus !== 'fighting' && (
              <button className="flee-btn" style={{marginTop: '15px'}} onClick={() => closeBattle()}>Close</button>
            )}
          </div>
        </div>
      )}

      <header className="game-header">
        <h1>Traveler of Aethelgard</h1>
        <p className="subtitle">Location: {currentStage.town}</p>
      </header>

      {/* --- DIGIVICE VIRTUAL PET PROFILE --- */}
      <div className="digivice-container">
        <div className="digivice-screen">
          <div className="digivice-sprite idle-bounce">{character.sprite}</div>
          <div className="digivice-stats">
            <div className="digivice-stage">{character.stage}</div>
            <div className="digivice-name">{character.title}</div>
            <div className="digivice-level">LVL {player.level} {equippedSkills.length > 0 && `(+${equippedSkills.length})`}</div>
            
            {/* NEW LCD-STYLED EXP BAR */}
            <div className="lcd-exp-container">
              <div className="lcd-exp-labels">
                <span>EXP</span>
                <span>{player.exp}/{baseExpForNextLevel}</span>
              </div>
              <div className="lcd-exp-bg">
                <div className="lcd-exp-fill" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>

          </div>
        </div>
        <div className="digivice-actions">
           <a href="https://alankhoocl.github.io/AI-Learning-Management/" target="_blank" rel="noopener noreferrer" className="train-btn">
              ⚙️ Go Train
            </a>
        </div>
      </div>

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
                {/* TIER LABELS HAVE BEEN REMOVED */}
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
        <button className="challenge-btn" onClick={startBattle}>Engage Auto-Battle</button>
        {battleMessage && (
          <div className={`battle-message ${battleMessage.includes('Victory') ? 'victory' : 'defeat'}`}>{battleMessage}</div>
        )}
      </div>

      <div className="equipped-section">
        <div className="equipped-header-row">
          <h2>Prepared Magic ({equippedSkills.length}/3)</h2>
          <button className="inn-btn" onClick={handleRestAtInn}>🛌 Rest</button>
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
