import { useEffect, useState, useRef } from 'react';
import { fetchAethelgardData } from './api/grimoire';
import './App.css';

// --- HARRY POTTER ENDLESS WORLD DATA ---
const ADJECTIVES = ["Cursed", "Forbidden", "Spectral", "Shadowy", "Bewitched", "Jinxed", "Hexed", "Dark", "Rogue", "Venomous", "Ancient", "Fierce"];
const NOUNS = ["Boggart", "Dementor", "Basilisk", "Acromantula", "Death Eater", "Troll", "Werewolf", "Grindylow", "Lethifold", "Horcrux", "Dragon", "Kelpie"];
const PLACES = ["the Forbidden Forest", "the Chamber of Secrets", "Azkaban", "the Shrieking Shack", "the Black Lake", "Knockturn Alley", "the Department of Mysteries", "Malfoy Manor", "the Room of Requirement", "the Whomping Willow"];

const getStageInfo = (index) => {
  const adj = ADJECTIVES[index % ADJECTIVES.length];
  const noun = NOUNS[(index * 3) % NOUNS.length];
  const place = PLACES[(index * 7) % PLACES.length];
  return {
    town: `Location: ${place}`,
    boss: `The ${adj} ${noun}`,
    reqLevel: 3 + (index * 4),
    lore: `A dark anomaly blocks the path. Your magical prowess must exceed its power.`
  };
};

// --- HOGWARTS EVOLUTION STAGES ---
const getCharacterEvolution = (level) => {
  if (level < 5) return { stage: "First-Year", sprite: "🪶", title: "Novice Spellcaster" };
  if (level < 10) return { stage: "Fifth-Year", sprite: "🦉", title: "O.W.L. Student" };
  if (level < 15) return { stage: "Prefect", sprite: "🪄", title: "Skilled Duelist" };
  if (level < 20) return { stage: "Auror", sprite: "⚡", title: "Dark Wizard Catcher" };
  return { stage: "Order Member", sprite: "🦡", title: "Champion of Hufflepuff" };
};

// --- THE GACHA POOL (Tech/Magic Themed) ---
const SKILL_POOL = {
  common: [
    { name: "Syntax Strike", power: 1, icon: "⚔️" }, { name: "Variable Shield", power: 1, icon: "🛡️" }, { name: "Loop Slash", power: 1, icon: "🔁" }, { name: "Console.log()", power: 1, icon: "👁️" }
  ],
  rare: [
    { name: "Array Barrage", power: 2, icon: "🧊" }, { name: "SQL Query", power: 2, icon: "🔍" }, { name: "Git Checkout", power: 2, icon: "🌿" }, { name: "Boolean Aura", power: 2, icon: "⚡" }
  ],
  epic: [
    { name: "Recursive Blast", power: 3, icon: "🌀" }, { name: "API Invocation", power: 3, icon: "🔗" }, { name: "Data Pipeline", power: 3, icon: "🌊" }, { name: "Regex Void", power: 3, icon: "🌌" }
  ],
  legendary: [
    { name: "Neural Network", power: 5, icon: "🧠" }, { name: "Sudo Root Access", power: 5, icon: "👑" }, { name: "Cloud Infrastructure", power: 5, icon: "🌩️" }, { name: "Omniscient AI", power: 5, icon: "🤖" }
  ]
};

function App() {
  const [player, setPlayer] = useState({ level: 1, exp: 0, skills: [], completedChaptersCount: 0, quests: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [stageIndex, setStageIndex] = useState(0);
  const [battleMessage, setBattleMessage] = useState("");
  const [restMessage, setRestMessage] = useState("");

  // --- MENU STATE ---
  const [activeMenu, setActiveMenu] = useState(null); // 'boss', 'equipped', or 'gacha'

  // --- GACHA INVENTORY STATES ---
  const [gachaInventory, setGachaInventory] = useState([]);
  const [equippedIds, setEquippedIds] = useState([]);
  const [totalRolls, setTotalRolls] = useState(0);
  const [summonMessage, setSummonMessage] = useState("");

  // --- AUTO-BATTLER STATES ---
  const [isBattling, setIsBattling] = useState(false);
  const [combatStatus, setCombatStatus] = useState('idle');
  const [playerHp, setPlayerHp] = useState(0);
  const [maxPlayerHp, setMaxPlayerHp] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [maxBossHp, setMaxBossHp] = useState(0);
  const [combatLog, setCombatLog] = useState([]);
  
  const logContainerRef = useRef(null);

  useEffect(() => {
    const savedStage = localStorage.getItem('aethelgard_stage');
    if (savedStage) setStageIndex(parseInt(savedStage, 10));
    
    const savedInventory = localStorage.getItem('aethelgard_gacha_inv');
    if (savedInventory) setGachaInventory(JSON.parse(savedInventory));
    
    const savedEquipped = localStorage.getItem('aethelgard_equipped_ids');
    if (savedEquipped) setEquippedIds(JSON.parse(savedEquipped));
    
    const savedRolls = localStorage.getItem('aethelgard_rolls');
    if (savedRolls) setTotalRolls(parseInt(savedRolls, 10));

    const loadData = async () => {
      const data = await fetchAethelgardData();
      setPlayer(data);
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('aethelgard_gacha_inv', JSON.stringify(gachaInventory));
    localStorage.setItem('aethelgard_equipped_ids', JSON.stringify(equippedIds));
    localStorage.setItem('aethelgard_rolls', totalRolls.toString());
  }, [gachaInventory, equippedIds, totalRolls]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [combatLog]);

  const manaCrystals = Math.max(0, player.completedChaptersCount - totalRolls);
  const equippedSkills = gachaInventory.filter(skill => equippedIds.includes(skill.id));
  const skillBonusLevel = equippedSkills.reduce((sum, skill) => sum + skill.power, 0);
  
  const effectiveLevel = player.level + skillBonusLevel;
  const currentStage = getStageInfo(stageIndex);
  const character = getCharacterEvolution(effectiveLevel);

  // --- SYNC DATA FUNCTION ---
  const syncData = async () => {
    setRestMessage("Syncing with the Hogwarts Archives...");
    const data = await fetchAethelgardData();
    setPlayer(data);
    setTimeout(() => setRestMessage("Sync Complete! EXP and Crystals updated."), 3000);
    setTimeout(() => setRestMessage(""), 6000);
  };

  const toggleMenu = (menu) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleSummon = () => {
    if (manaCrystals <= 0) {
      setSummonMessage("Not enough Crystals. Complete chapters!");
      setTimeout(() => setSummonMessage(""), 3000);
      return;
    }

    const roll = Math.random() * 100;
    let tier = 'common';
    if (roll < 5) tier = 'legendary';
    else if (roll < 15) tier = 'epic';
    else if (roll < 40) tier = 'rare';

    const pool = SKILL_POOL[tier];
    const pulledSkill = pool[Math.floor(Math.random() * pool.length)];
    const newSkill = { ...pulledSkill, tier, id: Date.now().toString() };

    setGachaInventory(prev => [newSkill, ...prev]);
    setTotalRolls(prev => prev + 1);
    
    setSummonMessage(`Pulled ${tier.toUpperCase()}: ${newSkill.name}!`);
    setTimeout(() => setSummonMessage(""), 4000);
  };

  const toggleEquipSkill = (id) => {
    if (equippedIds.includes(id)) {
      setEquippedIds(equippedIds.filter(equippedId => equippedId !== id));
    } else if (equippedIds.length < 3) {
      setEquippedIds([...equippedIds, id]);
    } else {
      setBattleMessage("You can only equip 3 spells at a time.");
      setTimeout(() => setBattleMessage(""), 3000);
    }
  };

  const handleRestAtInn = () => {
    setEquippedIds([]);
    setRestMessage("You rested in the common room. Spells reset.");
    setTimeout(() => setRestMessage(""), 4000);
  };

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

  useEffect(() => {
    if (combatStatus !== 'fighting') return;

    const timer = setTimeout(() => {
      const basePlayerDmg = effectiveLevel * 5 + (skillBonusLevel * 10);
      const playerDmg = Math.floor(basePlayerDmg + Math.random() * 10);
      const newBossHp = Math.max(0, bossHp - playerDmg);

      const baseBossDmg = currentStage.reqLevel * 6;
      const bossDmg = Math.floor(baseBossDmg + Math.random() * 15);
      const newPlayerHp = Math.max(0, playerHp - bossDmg);

      setBossHp(newBossHp);
      
      if (newBossHp <= 0) {
        setCombatLog(prev => [...prev, `💥 You dealt ${playerDmg} DMG!`, `🏆 ${currentStage.boss} has been defeated!`]);
        setCombatStatus('won');
        setTimeout(() => handleWin(), 2500);
        return;
      }

      setPlayerHp(newPlayerHp);
      
      setCombatLog(prev => [
        ...prev, 
        `🪄 You cast a spell for ${playerDmg} DMG!`, 
        `🩸 Enemy strikes back for ${bossDmg} DMG!`
      ]);

      if (newPlayerHp <= 0) {
        setCombatStatus('lost');
        setTimeout(() => closeBattle("You were defeated. Time to study and level up!"), 3000);
      }

    }, 1200);

    return () => clearTimeout(timer);
  }, [combatStatus, playerHp, bossHp, effectiveLevel, skillBonusLevel, currentStage]);

  const handleWin = () => {
    const nextStage = stageIndex + 1;
    setStageIndex(nextStage);
    localStorage.setItem('aethelgard_stage', nextStage);
    closeBattle(`Victory! You advance further into the darkness.`);
    setActiveMenu(null); // Close boss panel after win
  };

  const closeBattle = (message) => {
    setIsBattling(false);
    if (message) {
      setBattleMessage(message);
      setTimeout(() => setBattleMessage(""), 4000);
    }
  };

  const baseExpForCurrentLevel = Math.pow(player.level - 1, 2) * 100;
  const baseExpForNextLevel = Math.pow(player.level, 2) * 100;
  const progressPercentage = Math.min(((player.exp - baseExpForCurrentLevel) / (baseExpForNextLevel - baseExpForCurrentLevel)) * 100, 100);

  if (isLoading) return <div className="loading-screen">Booting Wizarding Device...</div>;

  return (
    <div className="rpg-container">
      
      {/* --- AUTO-BATTLER MODAL --- */}
      {isBattling && (
        <div className="battle-overlay">
          <div className="battle-modal digivice-battle">
            <h2 className="battle-title">DUEL ENGAGED</h2>
            
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
              <div className={`battle-sprite boss-sprite ${combatStatus === 'fighting' ? 'attacking-right' : ''}`}>☠️</div>
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
                <div key={index} className={`log-entry ${log.includes('You cast') ? 'log-player' : log.includes('Enemy strikes') ? 'log-boss' : 'log-system'}`}>
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
        <h1>Tracker of Magic</h1>
        <p className="subtitle">{currentStage.town}</p>
      </header>

      {/* --- DIGIVICE VIRTUAL PET PROFILE --- */}
      <div className="digivice-container">
        
        <div className="digivice-screen">
          <div className="digivice-sprite idle-bounce">{character.sprite}</div>
          <div className="digivice-stats">
            <div className="digivice-stage">{character.stage}</div>
            <div className="digivice-name">{character.title}</div>
            <div className="digivice-level">LVL {player.level} {skillBonusLevel > 0 && `(+${skillBonusLevel})`}</div>
            
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

        {restMessage && <div className="inn-message" style={{textAlign: 'center', marginBottom: '10px', color: 'var(--color-gold)'}}>{restMessage}</div>}

        <div className="digivice-actions">
           <button onClick={syncData} className="train-btn">
              🔄 Sync
           </button>
           <a href="https://alankhoocl.github.io/AI-Learning-Management/" target="_blank" rel="noopener noreferrer" className="train-btn">
              📚 Go Study
            </a>
        </div>

        {/* --- EXPANDABLE MENU BUTTONS --- */}
        <div className="digivice-menu">
          <button 
            className={`menu-btn ${activeMenu === 'boss' ? 'active' : ''}`} 
            onClick={() => toggleMenu('boss')}
            title="Boss Encounter"
          >
            ☠️
          </button>
          <button 
            className={`menu-btn ${activeMenu === 'equipped' ? 'active' : ''}`} 
            onClick={() => toggleMenu('equipped')}
            title="Prepared Magic"
          >
            🪄
          </button>
          <button 
            className={`menu-btn ${activeMenu === 'gacha' ? 'active' : ''}`} 
            onClick={() => toggleMenu('gacha')}
            title="Grimoire of Skills"
          >
            📜
          </button>
        </div>
      </div>

      {/* --- EXPANDABLE SECTIONS --- */}
      
      {activeMenu === 'boss' && (
        <div className="panel-section boss-card fade-in">
          <div className="boss-header">
            <h2 className="boss-name">THREAT: {currentStage.boss}</h2>
            <span className="boss-level">Req: LVL {currentStage.reqLevel}</span>
          </div>
          <p className="boss-lore">"{currentStage.lore}"</p>
          <button className="challenge-btn" onClick={startBattle}>Engage Duel</button>
          {battleMessage && (
            <div className={`battle-message ${battleMessage.includes('Victory') ? 'victory' : 'defeat'}`}>{battleMessage}</div>
          )}
        </div>
      )}

      {activeMenu === 'equipped' && (
        <div className="panel-section equipped-section fade-in">
          <div className="equipped-header-row">
            <h2>Prepared Spells ({equippedIds.length}/3)</h2>
            <button className="inn-btn" onClick={handleRestAtInn}>🛌 Rest</button>
          </div>

          <div className="equipped-slots">
            {[0, 1, 2].map(slotIndex => {
              const skill = equippedSkills[slotIndex];
              return (
                <div key={slotIndex} className={`spell-slot spell-card ${skill ? `filled tier-${skill.tier}` : 'empty'}`}>
                  {skill ? (
                    <>
                      <span className="spell-icon">{skill.icon}</span>
                      <div className="spell-details">
                        <span className="spell-name">{skill.name}</span>
                        <span className="spell-power">PWR +{skill.power}</span>
                      </div>
                    </>
                  ) : 'Empty Slot'}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeMenu === 'gacha' && (
        <div className="panel-section gacha-section fade-in">
          <div className="gacha-header">
            <h2>Grimoire Summoning</h2>
            <div className="crystal-count">💎 {manaCrystals} Crystals</div>
          </div>
          <p className="gacha-lore">Earn crystals by completing chapters in your Learning Center.</p>
          
          <button 
            className={`summon-btn ${manaCrystals > 0 ? 'active' : 'disabled'}`} 
            onClick={handleSummon}
            disabled={manaCrystals <= 0}
          >
            Summon Spell (1 💎)
          </button>
          
          {summonMessage && (
            <div className={`summon-message ${summonMessage.includes('LEGENDARY') ? 'legendary-pull' : ''}`}>
              {summonMessage}
            </div>
          )}

          <div className="inventory-grid">
            {gachaInventory.length > 0 ? (
              gachaInventory.map((skill) => {
                const isEquipped = equippedIds.includes(skill.id);
                return (
                  <div 
                    key={skill.id} 
                    className={`inventory-item tier-${skill.tier} ${isEquipped ? 'equipped-item' : ''}`} 
                    onClick={() => toggleEquipSkill(skill.id)}
                  >
                    <span className="inv-icon">{skill.icon}</span>
                    <span className="inv-name">{skill.name}</span>
                    <span className="inv-power">+{skill.power}</span>
                    {isEquipped && <div className="equipped-badge">E</div>}
                  </div>
                );
              })
            ) : (
              <p className="empty-state">No spells acquired yet. Summon to begin.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
