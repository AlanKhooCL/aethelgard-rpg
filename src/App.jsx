import { useEffect, useState, useRef } from 'react';
import { fetchAethelgardData } from './api/grimoire';
import './App.css';

// --- HARRY POTTER ENDLESS WORLD DATA ---
const BOSSES = [
  { id: 'boggart', name: 'Cursed Boggart', emoji: '🕷️', hp: 120, atk: 15, def: 5, reqLevel: 1, lore: 'A shape-shifting nightmare hiding in the wardrobe.' },
  { id: 'troll', name: 'Mountain Troll', emoji: '🧌', hp: 250, atk: 25, def: 15, reqLevel: 5, lore: 'A lumbering beast with immense strength and zero wits.' },
  { id: 'dementor', name: 'Azkaban Dementor', emoji: '👻', hp: 400, atk: 35, def: 20, reqLevel: 10, lore: 'It feeds on human happiness. Cast a Patronus!' },
  { id: 'basilisk', name: 'Chamber Basilisk', emoji: '🐍', hp: 600, atk: 50, def: 30, reqLevel: 15, lore: 'The King of Serpents. Do not look it in the eye.' },
  { id: 'dragon', name: 'Horntail Dragon', emoji: '🐉', hp: 1000, atk: 75, def: 40, reqLevel: 20, lore: 'The most dangerous of all dragon breeds.' }
];

const getCharacterEvolution = (level) => {
  if (level < 5) return { stage: "First-Year", spriteClass: "cat-stage-1", title: "Novice Spellcaster" };
  if (level < 10) return { stage: "Fifth-Year", spriteClass: "cat-stage-2", title: "O.W.L. Student" };
  if (level < 15) return { stage: "Prefect", spriteClass: "cat-stage-3", title: "Skilled Duelist" };
  if (level < 20) return { stage: "Auror", spriteClass: "cat-stage-3", title: "Dark Wizard Catcher" };
  return { stage: "Order Member", spriteClass: "cat-stage-4", title: "Champion of Hufflepuff" };
};

// --- THE GACHA POOL (Now with Battle Stats) ---
const SKILL_POOL = {
  common: [
    { name: "Syntax Strike", power: 15, icon: "⚔️", type: "atk", cd: 0 }, 
    { name: "Variable Shield", power: 20, icon: "🛡️", type: "def", cd: 2 }, 
    { name: "Nine Lives", power: 25, icon: "💚", type: "heal", cd: 3 }
  ],
  rare: [
    { name: "Array Barrage", power: 30, icon: "🧊", type: "atk", cd: 1 }, 
    { name: "SQL Debuff", power: 15, icon: "🔍", type: "debuff", cd: 2 }, 
    { name: "Boolean Aura", power: 40, icon: "⚡", type: "def", cd: 3 }
  ],
  epic: [
    { name: "Recursive Blast", power: 60, icon: "🌀", type: "atk", cd: 2 }, 
    { name: "API Drain", power: 40, icon: "🔗", type: "heal", cd: 3 }
  ],
  legendary: [
    { name: "Neural Network", power: 120, icon: "🧠", type: "atk", cd: 4 }, 
    { name: "Omniscient AI", power: 100, icon: "🤖", type: "heal", cd: 5 }
  ]
};

function App() {
  const [apiKey, setApiKey] = useState("");
  const [sheetsData, setSheetsData] = useState({ completedChaptersCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [restMessage, setRestMessage] = useState("");

  // --- PET STATS ---
  const [pet, setPet] = useState({ hunger: 80, happiness: 80, energy: 80, exp: 0, level: 1 });
  
  // --- MENU STATES ---
  const [activeMenu, setActiveMenu] = useState(null); 
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [mergeSelectedIds, setMergeSelectedIds] = useState([]);

  // --- GACHA INVENTORY STATES ---
  const [gachaInventory, setGachaInventory] = useState([]);
  const [equippedIds, setEquippedIds] = useState([]);
  const [totalRolls, setTotalRolls] = useState(0);
  const [summonMessage, setSummonMessage] = useState("");

  // --- BATTLE STATES ---
  const [battleState, setBattleState] = useState(null); // null means not in battle
  const [combatLog, setCombatLog] = useState([]);
  const logContainerRef = useRef(null);

  // --- CHAT STATES ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([]);

  useEffect(() => {
    const savedKey = localStorage.getItem('mofu_apikey');
    if (savedKey) setApiKey(savedKey);

    const savedPet = localStorage.getItem('mofu_pet');
    if (savedPet) setPet(JSON.parse(savedPet));
    
    const savedInventory = localStorage.getItem('mofu_gacha_inv');
    if (savedInventory) setGachaInventory(JSON.parse(savedInventory));
    
    const savedEquipped = localStorage.getItem('mofu_equipped_ids');
    if (savedEquipped) setEquippedIds(JSON.parse(savedEquipped));
    
    const savedRolls = localStorage.getItem('mofu_rolls');
    if (savedRolls) setTotalRolls(parseInt(savedRolls, 10));

    const loadData = async () => {
      const data = await fetchAethelgardData();
      setSheetsData(data);
      setIsLoading(false);
    };
    loadData();

    // Pet Stat Decay Loop
    const decay = setInterval(() => {
      setPet(p => ({
        ...p,
        hunger: Math.max(0, p.hunger - 0.5),
        happiness: Math.max(0, p.happiness - 0.5),
        energy: Math.max(0, p.energy - 0.25)
      }));
    }, 60000); // Decays every minute

    return () => clearInterval(decay);
  }, []);

  useEffect(() => {
    localStorage.setItem('mofu_pet', JSON.stringify(pet));
    localStorage.setItem('mofu_gacha_inv', JSON.stringify(gachaInventory));
    localStorage.setItem('mofu_equipped_ids', JSON.stringify(equippedIds));
    localStorage.setItem('mofu_rolls', totalRolls.toString());
  }, [pet, gachaInventory, equippedIds, totalRolls]);

  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [combatLog]);

  const manaCrystals = Math.max(0, sheetsData.completedChaptersCount - totalRolls);
  const equippedSkills = gachaInventory.filter(skill => equippedIds.includes(skill.id));
  const character = getCharacterEvolution(pet.level);
  
  const baseExpForCurrentLevel = Math.pow(pet.level - 1, 2) * 100;
  const baseExpForNextLevel = Math.pow(pet.level, 2) * 100;
  const progressPercentage = Math.min(((pet.exp - baseExpForCurrentLevel) / (baseExpForNextLevel - baseExpForCurrentLevel)) * 100, 100);

  // --- ACTIONS ---
  const syncData = async () => {
    setRestMessage("Syncing with Google Sheets...");
    const data = await fetchAethelgardData();
    setSheetsData(data);
    setTimeout(() => setRestMessage("Sync Complete! Crystals updated."), 3000);
    setTimeout(() => setRestMessage(""), 6000);
  };

  const gainExp = (amount) => {
    setPet(p => {
      const newExp = p.exp + amount;
      const newLevel = Math.floor(Math.sqrt(newExp / 100)) + 1;
      return { ...p, exp: newExp, level: newLevel };
    });
  };

  const handlePetAction = (action) => {
    setPet(p => {
      let next = { ...p };
      let msg = "";
      if (action === 'feed') {
        if (p.hunger >= 100) return p;
        next.hunger = Math.min(100, p.hunger + 20);
        next.happiness = Math.min(100, p.happiness + 5);
        msg = "Om nom nom! 🐟";
        gainExp(15);
      } else if (action === 'play') {
        if (p.energy < 10) return p;
        next.happiness = Math.min(100, p.happiness + 20);
        next.energy = Math.max(0, p.energy - 10);
        next.hunger = Math.max(0, p.hunger - 5);
        msg = "Pounce! 🧶";
        gainExp(20);
      } else if (action === 'sleep') {
        if (p.energy >= 100) return p;
        next.energy = Math.min(100, p.energy + 40);
        msg = "Zzz... 💤";
        gainExp(10);
      }
      setRestMessage(msg);
      setTimeout(() => setRestMessage(""), 3000);
      return next;
    });
  };

  const dpadAction = (dir) => {
    if (dir === 'right') {
      setRestMessage("Adventuring! ✨");
      gainExp(10);
      setPet(p => ({...p, energy: Math.max(0, p.energy - 2)}));
      setTimeout(() => setRestMessage(""), 2000);
    } else {
      setRestMessage(`Looking ${dir}...`);
      setTimeout(() => setRestMessage(""), 2000);
    }
  };

  // --- GEMINI CHAT ---
  const sendChat = async () => {
    if (!chatInput.trim() || !apiKey) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatLog(prev => [...prev, { sender: 'user', text: userMsg }]);
    
    try {
      const prompt = `You are my virtual pet cat, a Golden British Shorthair. You are at level ${pet.level}. My stats are: Hunger ${Math.floor(pet.hunger)}%, Happiness ${Math.floor(pet.happiness)}%, Energy ${Math.floor(pet.energy)}%. The user says: "${userMsg}". Respond in character in 1-2 short sentences. Use emojis.`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Meow? (Connection error)";
      
      setChatLog(prev => [...prev, { sender: 'pet', text: reply }]);
      gainExp(5);
      setPet(p => ({ ...p, happiness: Math.min(100, p.happiness + 10) }));
    } catch (e) {
      setChatLog(prev => [...prev, { sender: 'pet', text: "*angry hiss* (API Error)" }]);
    }
  };

  // --- GACHA & MERGE ---
  const toggleMenu = (menu) => {
    setActiveMenu(activeMenu === menu ? null : menu);
    setIsMergeMode(false);
    setMergeSelectedIds([]);
  };

  const handleSummon = () => {
    if (manaCrystals <= 0) return;
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
    setTimeout(() => setSummonMessage(isMergeMode ? "Select 2 identical spells!" : ""), 4000);
  };

  const handleInventoryClick = (skill) => {
    if (isMergeMode) {
      if (mergeSelectedIds.includes(skill.id)) {
        setMergeSelectedIds(prev => prev.filter(id => id !== skill.id));
        return;
      }
      const newSelection = [...mergeSelectedIds, skill.id];
      if (newSelection.length === 2) {
        const skill1 = gachaInventory.find(s => s.id === newSelection[0]);
        const skill2 = gachaInventory.find(s => s.id === newSelection[1]);

        if (skill1.name !== skill2.name) {
          setSummonMessage("Failed! Spells must be identical.");
          setTimeout(() => setSummonMessage("Select 2 identical spells!"), 3000);
          setMergeSelectedIds([]);
          return;
        }

        const tiers = ['common', 'rare', 'epic', 'legendary'];
        const currentTierIndex = tiers.indexOf(skill1.tier);
        let nextTierIndex = currentTierIndex;
        if (Math.random() < 0.30 && currentTierIndex < 3) nextTierIndex++;

        const targetTier = tiers[nextTierIndex];
        const targetPool = SKILL_POOL[targetTier];
        const newSpell = targetPool[Math.floor(Math.random() * targetPool.length)];
        const mergedSkill = { ...newSpell, tier: targetTier, id: Date.now().toString() };

        setGachaInventory(prev => [mergedSkill, ...prev.filter(s => s.id !== newSelection[0] && s.id !== newSelection[1])]);
        setEquippedIds(prev => prev.filter(id => id !== newSelection[0] && id !== newSelection[1]));
        
        setSummonMessage(nextTierIndex > currentTierIndex ? `✨ UPGRADED TO ${targetTier.toUpperCase()}: ${mergedSkill.name}! ✨` : `Merged into: ${mergedSkill.name}!`);
        setTimeout(() => setSummonMessage("Select 2 identical spells!"), 4000);
        setMergeSelectedIds([]);
      } else {
        setMergeSelectedIds(newSelection);
      }
    } else {
      if (equippedIds.includes(skill.id)) {
        setEquippedIds(equippedIds.filter(id => id !== skill.id));
      } else if (equippedIds.length < 3) {
        setEquippedIds([...equippedIds, skill.id]);
      } else {
        setSummonMessage("Only 3 spells can be equipped.");
        setTimeout(() => setSummonMessage(""), 3000);
      }
    }
  };

  // --- COMBAT ENGINE ---
  const startBattle = (boss) => {
    if (pet.level < boss.reqLevel) {
      setRestMessage(`Requires LVL ${boss.reqLevel} to challenge!`);
      setTimeout(() => setRestMessage(""), 3000);
      return;
    }
    
    const petMaxHp = pet.level * 30 + 100;
    setBattleState({
      boss,
      petHp: petMaxHp,
      petMaxHp,
      bossHp: boss.hp,
      turn: 'player',
      cooldowns: {}, // maps skill.id -> turns left
      shield: 0
    });
    setCombatLog([`You engaged ${boss.name}!`, `Your spells are ready.`]);
    setActiveMenu('battle');
  };

  const useSkill = (skill) => {
    if (battleState.turn !== 'player' || battleState.cooldowns[skill.id]) return;

    setBattleState(prev => {
      let next = { ...prev, turn: 'boss' };
      let logs = [...combatLog];
      
      // Apply Skill
      if (skill.type === 'atk') {
        const dmg = Math.floor(skill.power + (pet.level * 2) + Math.random() * 10);
        next.bossHp = Math.max(0, next.bossHp - dmg);
        logs.push(`🪄 Cast ${skill.name}! Dealt ${dmg} DMG.`);
      } else if (skill.type === 'def') {
        next.shield += skill.power;
        logs.push(`🛡️ Cast ${skill.name}! Shield boosted by ${skill.power}.`);
      } else if (skill.type === 'heal') {
        const heal = skill.power + (pet.level * 5);
        next.petHp = Math.min(next.petMaxHp, next.petHp + heal);
        logs.push(`💚 Cast ${skill.name}! Recovered ${heal} HP.`);
      }

      // Set Cooldown
      if (skill.cd > 0) {
        next.cooldowns = { ...next.cooldowns, [skill.id]: skill.cd + 1 }; // +1 because it ticks down immediately on boss turn
      }

      setCombatLog(logs);
      return next;
    });
  };

  // Boss Turn Effect
  useEffect(() => {
    if (activeMenu === 'battle' && battleState?.turn === 'boss') {
      if (battleState.bossHp <= 0) {
        setCombatLog(prev => [...prev, `🏆 ${battleState.boss.name} has been defeated! +500 EXP!`]);
        gainExp(500);
        setTimeout(() => { setActiveMenu('boss'); setBattleState(null); }, 3000);
        return;
      }

      const timer = setTimeout(() => {
        setBattleState(prev => {
          let next = { ...prev, turn: 'player' };
          let logs = [...combatLog];
          
          // Boss Attacks
          let dmg = Math.floor(next.boss.atk + Math.random() * 10);
          if (next.shield > 0) {
            const blocked = Math.min(dmg, next.shield);
            dmg -= blocked;
            next.shield -= blocked;
            logs.push(`🛡️ Shield absorbed ${blocked} DMG!`);
          }
          
          next.petHp = Math.max(0, next.petHp - dmg);
          logs.push(`☠️ ${next.boss.name} attacked for ${dmg} DMG!`);

          // Tick down cooldowns
          const newCds = {};
          Object.entries(next.cooldowns).forEach(([id, turns]) => {
            if (turns > 1) newCds[id] = turns - 1;
          });
          next.cooldowns = newCds;

          setCombatLog(logs);
          return next;
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [battleState, activeMenu]);

  // Handle Player Death
  useEffect(() => {
    if (activeMenu === 'battle' && battleState?.petHp <= 0) {
      setCombatLog(prev => [...prev, `💔 You were defeated. Rest and try again.`]);
      setTimeout(() => { setActiveMenu('boss'); setBattleState(null); }, 3000);
    }
  }, [battleState, activeMenu]);


  if (isLoading) return <div className="loading-screen">Booting Wizarding Device...</div>;

  return (
    <div className="rpg-container">
      <header className="game-header">
        <h1>M.O.F.U.</h1>
        <p className="subtitle">Mystic Order of Familiar Unity</p>
      </header>

      {/* --- DIGIVICE VIRTUAL PET PROFILE --- */}
      <div className="digivice-container">
        
        <div className="digivice-top-bar">
           <button onClick={() => toggleMenu('settings')} className="icon-btn" title="Settings">⚙️</button>
           <button onClick={syncData} className="icon-btn" title="Sync Spreadsheets">🔄</button>
        </div>

        <div className="digivice-screen">
          <div className={`cat-sprite digivice-sprite ${character.spriteClass}`}></div>
          <div className="digivice-stats">
            <div className="digivice-stage">{character.stage}</div>
            <div className="digivice-name">{character.title}</div>
            <div className="digivice-level">LVL {pet.level}</div>
            
            <div className="stat-bars">
               <div className="stat-row"><span className="stat-label">HNGR</span><div className="stat-track"><div className="stat-fill orange" style={{width: `${pet.hunger}%`}}></div></div></div>
               <div className="stat-row"><span className="stat-label">HPPY</span><div className="stat-track"><div className="stat-fill yellow" style={{width: `${pet.happiness}%`}}></div></div></div>
               <div className="stat-row"><span className="stat-label">ENRG</span><div className="stat-track"><div className="stat-fill blue" style={{width: `${pet.energy}%`}}></div></div></div>
               <div className="stat-row"><span className="stat-label">EXP</span><div className="stat-track"><div className="stat-fill green" style={{width: `${progressPercentage}%`}}></div></div></div>
            </div>
          </div>
        </div>

        {restMessage && <div className="inn-message" style={{textAlign: 'center', margin: '5px 0', color: 'var(--color-gold)'}}>{restMessage}</div>}

        {/* --- D-PAD & CARE BUTTONS --- */}
        <div className="controls-panel">
          <div className="dpad">
            <div></div><button className="dpad-btn" onClick={() => dpadAction('up')}>▲</button><div></div>
            <button className="dpad-btn" onClick={() => dpadAction('left')}>◀</button><div className="dpad-center"></div><button className="dpad-btn" onClick={() => dpadAction('right')}>▶</button>
            <div></div><button className="dpad-btn" onClick={() => dpadAction('down')}>▼</button><div></div>
          </div>
          
          <div className="action-buttons">
            <button className="action-btn" onClick={() => handlePetAction('feed')}>🍖</button>
            <button className="action-btn" onClick={() => handlePetAction('play')}>🧶</button>
            <button className="action-btn" onClick={() => handlePetAction('sleep')}>💤</button>
            <button className="action-btn" onClick={() => toggleMenu('chat')}>💬</button>
          </div>
        </div>

        {/* --- EXPANDABLE MENU BUTTONS --- */}
        <div className="digivice-menu">
          <button className={`menu-btn ${activeMenu === 'boss' ? 'active' : ''}`} onClick={() => toggleMenu('boss')} title="Adventures">🗺️</button>
          <button className={`menu-btn ${activeMenu === 'equipped' ? 'active' : ''}`} onClick={() => toggleMenu('equipped')} title="Prepared Magic">🪄</button>
          <button className={`menu-btn ${activeMenu === 'gacha' ? 'active' : ''}`} onClick={() => toggleMenu('gacha')} title="Grimoire">📜</button>
        </div>
      </div>

      {/* --- EXPANDABLE SECTIONS --- */}

      {/* CHAT OVERLAY */}
      {activeMenu === 'chat' && (
        <div className="panel-section chat-section fade-in">
          <h2>Talk to Familiar</h2>
          <div className="chat-box">
             {chatLog.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.sender}`}>{msg.text}</div>
             ))}
          </div>
          <div className="chat-input-row">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Say something..." onKeyDown={e => e.key === 'Enter' && sendChat()} />
            <button onClick={sendChat}>Send</button>
          </div>
        </div>
      )}

      {/* SETTINGS OVERLAY */}
      {activeMenu === 'settings' && (
        <div className="panel-section settings-section fade-in">
          <h2>M.O.F.U. Settings</h2>
          <label>Gemini API Key (For AI Chat):</label>
          <input type="password" value={apiKey} onChange={e => { setApiKey(e.target.value); localStorage.setItem('mofu_apikey', e.target.value); }} placeholder="AIza..." className="api-input" />
          <a href="https://alankhoocl.github.io/AI-Learning-Management/" target="_blank" rel="noopener noreferrer" className="challenge-btn" style={{marginTop:'15px', display:'block', textAlign:'center', textDecoration:'none'}}>Go to Learning Center</a>
        </div>
      )}
      
      {/* BOSS SELECTION */}
      {activeMenu === 'boss' && (
        <div className="panel-section fade-in">
          <h2>Wanted Board</h2>
          <div className="boss-list">
            {BOSSES.map(boss => (
               <div key={boss.id} className={`boss-card ${pet.level < boss.reqLevel ? 'locked' : ''}`} onClick={() => startBattle(boss)}>
                  <div className="boss-emoji">{boss.emoji}</div>
                  <div className="boss-info">
                     <div className="boss-name">{boss.name}</div>
                     <div className="boss-req">Req: LVL {boss.reqLevel}</div>
                  </div>
               </div>
            ))}
          </div>
        </div>
      )}

      {/* BATTLE SCREEN */}
      {activeMenu === 'battle' && battleState && (
        <div className="panel-section battle-section fade-in">
          <h2 style={{color: 'var(--color-danger)', textAlign:'center'}}>DUEL ENGAGED</h2>
          
          <div className="battle-arena">
             <div className="combatant">
                <div className={`cat-sprite battle-sprite ${character.spriteClass} ${battleState.turn === 'player' ? 'active-turn' : ''}`}></div>
                <div className="hp-text">{battleState.petHp} / {battleState.petMaxHp} HP</div>
                <div className="hp-track"><div className="hp-fill green" style={{width: `${(battleState.petHp/battleState.petMaxHp)*100}%`}}></div></div>
                {battleState.shield > 0 && <div className="shield-text">🛡️ {battleState.shield}</div>}
             </div>
             <div className="vs-badge">VS</div>
             <div className="combatant">
                <div className={`boss-sprite ${battleState.turn === 'boss' ? 'active-turn' : ''}`}>{battleState.boss.emoji}</div>
                <div className="hp-text">{battleState.bossHp} / {battleState.boss.hp} HP</div>
                <div className="hp-track"><div className="hp-fill red" style={{width: `${(battleState.bossHp/battleState.boss.hp)*100}%`}}></div></div>
             </div>
          </div>

          <div className="combat-log" ref={logContainerRef}>
             {combatLog.map((log, index) => <div key={index} className="log-entry">{log}</div>)}
          </div>

          <div className="battle-skills">
             {equippedSkills.length === 0 && <div style={{textAlign:'center', width:'100%', color:'#888'}}>No Spells Equipped. You can only watch!</div>}
             {equippedSkills.map(skill => {
                const isOnCooldown = battleState.cooldowns[skill.id] > 0;
                return (
                  <button key={skill.id} className={`skill-btn ${isOnCooldown ? 'cooldown' : ''}`} onClick={() => useSkill(skill)} disabled={battleState.turn !== 'player' || isOnCooldown}>
                     <span className="s-icon">{skill.icon}</span>
                     <span className="s-name">{skill.name}</span>
                     {isOnCooldown && <span className="s-cd">CD: {battleState.cooldowns[skill.id]}</span>}
                  </button>
                )
             })}
          </div>
        </div>
      )}

      {/* EQUIPPED MAGIC */}
      {activeMenu === 'equipped' && (
        <div className="panel-section equipped-section fade-in">
          <h2>Prepared Spells ({equippedIds.length}/3)</h2>
          <div className="equipped-slots">
            {[0, 1, 2].map(slotIndex => {
              const skill = equippedSkills[slotIndex];
              return (
                <div key={slotIndex} className={`spell-card ${skill ? `filled tier-${skill.tier}` : 'empty'}`}>
                  {skill ? (
                    <>
                      <span className="spell-icon">{skill.icon}</span>
                      <div className="spell-details">
                        <span className="spell-name">{skill.name}</span>
                        <span className="spell-power">PWR: {skill.power} | CD: {skill.cd}</span>
                      </div>
                    </>
                  ) : 'Empty Slot'}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GACHA */}
      {activeMenu === 'gacha' && (
        <div className="panel-section gacha-section fade-in">
          <div className="gacha-header">
            <h2>Grimoire</h2>
            <div className="crystal-count">💎 {manaCrystals}</div>
          </div>
          
          <div className="gacha-actions">
            <button className={`summon-btn ${manaCrystals > 0 && !isMergeMode ? 'active' : 'disabled'}`} onClick={handleSummon} disabled={manaCrystals <= 0 || isMergeMode}>Summon (1 💎)</button>
            <button className={`merge-btn ${isMergeMode ? 'active' : ''}`} onClick={() => setIsMergeMode(!isMergeMode)}>{isMergeMode ? 'Cancel' : '🔀 Merge'}</button>
          </div>
          
          {summonMessage && <div className={`summon-message ${summonMessage.includes('UPGRADED') ? 'legendary-pull' : ''}`}>{summonMessage}</div>}

          <div className="inventory-grid">
            {gachaInventory.length > 0 ? (
              gachaInventory.map((skill) => {
                const isEquipped = equippedIds.includes(skill.id);
                const isSelectedForMerge = mergeSelectedIds.includes(skill.id);
                return (
                  <div key={skill.id} className={`inventory-item tier-${skill.tier} ${isEquipped && !isMergeMode ? 'equipped-item' : ''} ${isSelectedForMerge ? 'merge-selected' : ''}`} onClick={() => handleInventoryClick(skill)}>
                    <span className="inv-icon">{skill.icon}</span>
                    <span className="inv-name">{skill.name}</span>
                    <span className="inv-power">PWR {skill.power}</span>
                    {isEquipped && !isMergeMode && <div className="equipped-badge">E</div>}
                  </div>
                );
              })
            ) : <p className="empty-state">No spells acquired yet.</p>}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
