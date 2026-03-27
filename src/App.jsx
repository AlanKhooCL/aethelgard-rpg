import { useEffect, useState, useRef } from 'react';
import { fetchAethelgardData } from './api/grimoire';
import './App.css';

// --- ONE PIECE GACHA POOL ---
const SKILL_POOL = {
  common: [
    { name: "Gum-Gum Pistol", power: 15, icon: "👊", type: "atk", cd: 0 }, 
    { name: "Shave (Soru)", power: 20, icon: "💨", type: "def", cd: 2 }, 
    { name: "Meat Chunk", power: 25, icon: "🍖", type: "heal", cd: 3 }
  ],
  rare: [
    { name: "Diable Jambe", power: 30, icon: "🔥", type: "atk", cd: 1 }, 
    { name: "Room", power: 15, icon: "🌐", type: "debuff", cd: 2 }, 
    { name: "Iron Body", power: 40, icon: "🛡️", type: "def", cd: 3 }
  ],
  epic: [
    { name: "Armament Haki", power: 60, icon: "⬛", type: "atk", cd: 2 }, 
    { name: "Phoenix Flame", power: 40, icon: "🐦", type: "heal", cd: 3 }
  ],
  legendary: [
    { name: "Conqueror's Haki", power: 120, icon: "👑", type: "atk", cd: 4 }, 
    { name: "Gear 5: Sun God", power: 100, icon: "☀️", type: "heal", cd: 5 },
    { name: "Divine Departure", power: 150, icon: "🗡️", type: "atk", cd: 5 }
  ]
};

const getCharacterEvolution = (level) => {
  if (level < 5) return { stage: "First-Year", spriteClass: "cat-stage-1", title: "Novice" };
  if (level < 10) return { stage: "Fifth-Year", spriteClass: "cat-stage-2", title: "O.W.L." };
  if (level < 15) return { stage: "Prefect", spriteClass: "cat-stage-3", title: "Duelist" };
  if (level < 20) return { stage: "Auror", spriteClass: "cat-stage-3", title: "Catcher" };
  return { stage: "Order Member", spriteClass: "cat-stage-4", title: "Champion" };
};

function App() {
  // --- SETTINGS & DATA STATES ---
  const [apiKey, setApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3.0-flash-preview");
  const [sheetsData, setSheetsData] = useState({ completedChaptersCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [sysMessage, setSysMessage] = useState("");

  // --- PET & RPG STATES ---
  const [pet, setPet] = useState({ name: "MIKAN", hunger: 80, happiness: 80, energy: 80, exp: 0, level: 1, rebirths: 0 });
  const [bosses, setBosses] = useState([
    { id: 'arlong', name: 'Saw-Tooth Arlong', emoji: '🦈', hp: 120, atk: 15, def: 5, reqLevel: 1, lore: 'A ruthless fish-man pirate.' },
    { id: 'crocodile', name: 'Sir Crocodile', emoji: '🐊', hp: 300, atk: 25, def: 15, reqLevel: 5, lore: 'Leader of Baroque Works.' }
  ]);
  
  // --- UI STATES ---
  const [activeMenu, setActiveMenu] = useState('home'); 
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [mergeSelectedIds, setMergeSelectedIds] = useState([]);
  const [isGeneratingBoss, setIsGeneratingBoss] = useState(false);

  // --- INVENTORY STATES ---
  const [gachaInventory, setGachaInventory] = useState([]);
  const [equippedIds, setEquippedIds] = useState([]);
  const [totalRolls, setTotalRolls] = useState(0);

  // --- BATTLE STATES ---
  const [battleState, setBattleState] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const logContainerRef = useRef(null);

  // --- CHAT STATES ---
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([]);

  // Load saved data
  useEffect(() => {
    const savedKey = localStorage.getItem('mofu_apikey');
    const savedModel = localStorage.getItem('mofu_model');
    if (savedKey) setApiKey(savedKey);
    if (savedModel) setGeminiModel(savedModel);

    const savedPet = localStorage.getItem('mofu_pet');
    if (savedPet) {
      const parsedPet = JSON.parse(savedPet);
      setPet(p => ({ ...p, ...parsedPet, name: parsedPet.name || "MIKAN" }));
    }
    
    const savedBosses = localStorage.getItem('mofu_bosses');
    if (savedBosses) setBosses(JSON.parse(savedBosses));
    
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

    // Stat Decay
    const decay = setInterval(() => {
      setPet(p => ({
        ...p,
        hunger: Math.max(0, p.hunger - 0.5),
        happiness: Math.max(0, p.happiness - 0.5),
        energy: Math.max(0, p.energy - 0.25)
      }));
    }, 60000);

    return () => clearInterval(decay);
  }, []);

  // Auto-save data
  useEffect(() => {
    localStorage.setItem('mofu_pet', JSON.stringify(pet));
    localStorage.setItem('mofu_bosses', JSON.stringify(bosses));
    localStorage.setItem('mofu_gacha_inv', JSON.stringify(gachaInventory));
    localStorage.setItem('mofu_equipped_ids', JSON.stringify(equippedIds));
    localStorage.setItem('mofu_rolls', totalRolls.toString());
  }, [pet, bosses, gachaInventory, equippedIds, totalRolls]);

  // Auto-scroll combat log
  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [combatLog]);

  const notify = (msg) => {
    setSysMessage(msg);
    setTimeout(() => setSysMessage(""), 3000);
  };

  const syncData = async () => {
    notify("Syncing Sheets...");
    const data = await fetchAethelgardData();
    setSheetsData(data);
    setTimeout(() => notify("Sync Complete!"), 2000);
  };

  const gainExp = (amount) => {
    setPet(p => {
      const newExp = p.exp + amount;
      const newLevel = Math.floor(Math.sqrt(newExp / 100)) + 1;
      return { ...p, exp: newExp, level: newLevel };
    });
  };

  // --- REBIRTH SYSTEM ---
  const handleRebirth = () => {
    if (pet.level < 20) return;
    setPet(p => ({ ...p, level: 1, exp: 0, rebirths: (p.rebirths || 0) + 1 }));
    
    // Give guaranteed legendary
    const pool = SKILL_POOL['legendary'];
    const pulledSkill = { ...pool[Math.floor(Math.random() * pool.length)], tier: 'legendary', id: Date.now().toString() };
    setGachaInventory(prev => [pulledSkill, ...prev]);
    
    notify("✨ REBORN! LEGENDARY SKILL ACQUIRED! ✨");
  };

  // --- AI BOSS GENERATION ---
  const generateAIBoss = async () => {
    if (!apiKey) { notify("Missing API Key in Settings!"); return; }
    setIsGeneratingBoss(true);
    notify("Scanning for new threats...");

    try {
      const prompt = `Generate a unique, creative anime or fantasy RPG boss. 
      Return ONLY a raw JSON object with these exact keys:
      "id": (random unique string),
      "name": (creative boss name),
      "emoji": (a single emoji representing the boss),
      "hp": ${pet.level * 60},
      "atk": ${pet.level * 6},
      "def": ${pet.level * 3},
      "reqLevel": ${pet.level},
      "lore": (1 short sentence describing the boss).
      Do not include markdown tags like \`\`\`json.`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json", temperature: 0.8 } })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      let text = data.candidates[0].content.parts[0].text;
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const newBoss = JSON.parse(text);

      setBosses(prev => [...prev, newBoss]);
      notify(`🚨 NEW THREAT DETECTED: ${newBoss.name}!`);
    } catch (e) {
      console.error(e);
      notify("Failed to locate threat. Try again.");
    } finally {
      setIsGeneratingBoss(false);
    }
  };

  // --- AI CHAT ---
  const sendChat = async () => {
    if (!chatInput.trim() || !apiKey) { notify(!apiKey ? "Missing API Key!" : "Type a message!"); return; }
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatLog(prev => [...prev, { sender: 'user', text: userMsg }]);
    
    try {
      const prompt = `You are my virtual pet cat named MIKAN, a Golden British Shorthair. You are at level ${pet.level}. My stats are: Hunger ${Math.floor(pet.hunger)}%, Happiness ${Math.floor(pet.happiness)}%, Energy ${Math.floor(pet.energy)}%. The user says: "${userMsg}". Respond in character in 1 short sentence. Use plain English. Do not output markdown, symbols, or code blocks. Use emojis.`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 100, temperature: 0.7 } })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Meow?";
      
      setChatLog(prev => [...prev, { sender: 'pet', text: reply }]);
      gainExp(5);
      setPet(p => ({ ...p, happiness: Math.min(100, p.happiness + 10) }));
    } catch (e) {
      setChatLog(prev => [...prev, { sender: 'pet', text: `*hisses* Connection failed: ${e.message}` }]);
    }
  };

  const handlePetAction = (action) => {
    setPet(p => {
      let next = { ...p };
      if (action === 'feed') {
        if (p.hunger >= 100) return p;
        next.hunger = Math.min(100, p.hunger + 20);
        next.happiness = Math.min(100, p.happiness + 5);
        notify(`Fed ${pet.name}! +15 EXP`);
        gainExp(15);
      } else if (action === 'play') {
        if (p.energy < 10) return p;
        next.happiness = Math.min(100, p.happiness + 20);
        next.energy = Math.max(0, p.energy - 10);
        next.hunger = Math.max(0, p.hunger - 5);
        notify("Played! +20 EXP");
        gainExp(20);
      } else if (action === 'sleep') {
        if (p.energy >= 100) return p;
        next.energy = Math.min(100, p.energy + 40);
        notify("Resting... +10 EXP");
        gainExp(10);
      }
      return next;
    });
  };

  const dpadAction = (dir) => {
    if (dir === 'right') {
      notify("Exploring... +10 EXP");
      gainExp(10);
      setPet(p => ({...p, energy: Math.max(0, p.energy - 2)}));
    } else if (dir === 'up') { syncData(); } 
    else { notify(`Looking ${dir}...`); }
  };

  const handleSummon = () => {
    const manaCrystals = Math.max(0, sheetsData.completedChaptersCount - totalRolls);
    if (manaCrystals <= 0) { notify("Not enough crystals!"); return; }
    
    const roll = Math.random() * 100;
    let tier = roll < 5 ? 'legendary' : roll < 15 ? 'epic' : roll < 40 ? 'rare' : 'common';
    const pool = SKILL_POOL[tier];
    const pulledSkill = { ...pool[Math.floor(Math.random() * pool.length)], tier, id: Date.now().toString() };

    setGachaInventory(prev => [pulledSkill, ...prev]);
    setTotalRolls(prev => prev + 1);
    notify(`Summoned ${tier}: ${pulledSkill.name}!`);
  };

  const startBattle = (boss) => {
    if (pet.level < boss.reqLevel) { notify(`LVL ${boss.reqLevel} Required!`); return; }
    const petMaxHp = pet.level * 30 + 100;
    setBattleState({ boss, petHp: petMaxHp, petMaxHp, bossHp: boss.hp, turn: 'player', cooldowns: {}, shield: 0 });
    setCombatLog([`Engaged ${boss.name}!`, `Select a skill.`]);
    setActiveMenu('battle');
  };

  const useSkill = (skill) => {
    if (battleState.turn !== 'player' || battleState.cooldowns[skill.id]) return;
    setBattleState(prev => {
      let next = { ...prev, turn: 'boss' };
      let logs = [...combatLog];
      
      if (skill.type === 'atk') {
        const dmg = Math.floor(skill.power + (pet.level * 2) + Math.random() * 10);
        next.bossHp = Math.max(0, next.bossHp - dmg);
        logs.push(`> Used ${skill.name}! Dealt ${dmg} DMG.`);
      } else if (skill.type === 'def') {
        next.shield += skill.power;
        logs.push(`> Used ${skill.name}! Shield +${skill.power}.`);
      } else if (skill.type === 'heal') {
        const heal = skill.power + (pet.level * 5);
        next.petHp = Math.min(next.petMaxHp, next.petHp + heal);
        logs.push(`> Used ${skill.name}! +${heal} HP.`);
      }

      if (skill.cd > 0) next.cooldowns = { ...next.cooldowns, [skill.id]: skill.cd + 1 };
      setCombatLog(logs);
      return next;
    });
  };

  useEffect(() => {
    if (activeMenu === 'battle' && battleState?.turn === 'boss') {
      if (battleState.bossHp <= 0) {
        setCombatLog(prev => [...prev, `🏆 ${battleState.boss.name} defeated! +500 EXP!`]);
        gainExp(500);
        setTimeout(() => { setActiveMenu('boss'); setBattleState(null); }, 3000);
        return;
      }
      const timer = setTimeout(() => {
        setBattleState(prev => {
          let next = { ...prev, turn: 'player' };
          let logs = [...combatLog];
          let dmg = Math.floor(next.boss.atk + Math.random() * 10);
          if (next.shield > 0) {
            const blocked = Math.min(dmg, next.shield);
            dmg -= blocked;
            next.shield -= blocked;
            logs.push(`> Shield blocked ${blocked} DMG!`);
          }
          next.petHp = Math.max(0, next.petHp - dmg);
          logs.push(`> Boss attacked for ${dmg} DMG!`);

          const newCds = {};
          Object.entries(next.cooldowns).forEach(([id, turns]) => { if (turns > 1) newCds[id] = turns - 1; });
          next.cooldowns = newCds;

          setCombatLog(logs);
          return next;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (activeMenu === 'battle' && battleState?.petHp <= 0) {
      setCombatLog(prev => [...prev, `💔 You were defeated.`]);
      setTimeout(() => { setActiveMenu('boss'); setBattleState(null); }, 3000);
    }
  }, [battleState, activeMenu]);

  if (isLoading) return <div style={{color:'#FFDB00', textAlign:'center', marginTop:'50px'}}>Booting OS...</div>;

  const character = getCharacterEvolution(pet.level);
  const manaCrystals = Math.max(0, sheetsData.completedChaptersCount - totalRolls);
  const equippedSkills = gachaInventory.filter(skill => equippedIds.includes(skill.id));

  return (
    <div className="rpg-container">
      <div className="device">
        
        <div className="device-top">
          <span className="brand">POCKETPAL OS</span>
          <div className="led"></div>
          <div className="top-nav-actions">
            <a href="https://alankhoocl.github.io/AI-Learning-Management/" target="_blank" rel="noopener noreferrer" className="settings-btn" style={{textDecoration: 'none'}}>A.L.A.N</a>
            <button className="settings-btn" onClick={() => setActiveMenu('settings')}>⚙</button>
          </div>
        </div>

        <div className="screen-bezel">
          <div className="screen">
            
            <div className={`notif ${sysMessage ? 'show' : ''}`}>{sysMessage}</div>

            <div className="screen-header">
              <div className="pet-name-display">{pet.name} {pet.rebirths > 0 && `[R${pet.rebirths}]`}</div>
              <div className="level-display">LV.{pet.level}</div>
            </div>

            <div className="tab-bar">
              <button className={`tab-btn ${activeMenu === 'home' ? 'active' : ''}`} onClick={() => setActiveMenu('home')}>HOME</button>
              <button className={`tab-btn ${activeMenu === 'chat' ? 'active' : ''}`} onClick={() => setActiveMenu('chat')}>CHAT</button>
              <button className={`tab-btn ${activeMenu === 'boss' ? 'active' : ''}`} onClick={() => setActiveMenu('boss')}>BATTLE</button>
              <button className={`tab-btn ${activeMenu === 'gacha' ? 'active' : ''}`} onClick={() => setActiveMenu('gacha')}>MAGIC</button>
            </div>

            <div className="view-area">
              {activeMenu === 'home' && (
                <div className="tab-view active">
                  <div className="pet-stage">
                    <div className="stage-badge">— {character.stage} —</div>
                    <div className={`cat-sprite ${character.spriteClass}`}></div>
                  </div>
                  <div className="stats-panel">
                    <div className="stat-row"><span className="stat-label">HNGR</span><div className="stat-bar-track"><div className="stat-bar-fill orange" style={{width: `${pet.hunger}%`}}></div></div></div>
                    <div className="stat-row"><span className="stat-label">HPPY</span><div className="stat-track stat-bar-track"><div className="stat-bar-fill yellow" style={{width: `${pet.happiness}%`}}></div></div></div>
                    <div className="stat-row"><span className="stat-label">ENRG</span><div className="stat-track stat-bar-track"><div className="stat-bar-fill blue" style={{width: `${pet.energy}%`}}></div></div></div>
                  </div>
                  {pet.level >= 20 && (
                    <button className="rebirth-btn" onClick={handleRebirth}>✨ REBIRTH (LVL 20+) ✨</button>
                  )}
                </div>
              )}

              {activeMenu === 'chat' && (
                <div className="tab-view active chat-view">
                  <div className="chat-messages">
                    {chatLog.map((m, i) => <div key={i} className={`chat-msg ${m.sender}`}>{m.text}</div>)}
                  </div>
                  <div className="chat-input-row">
                    <input className="chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Say something..." />
                    <button className="chat-send-btn" onClick={sendChat}>SEND</button>
                  </div>
                </div>
              )}

              {activeMenu === 'gacha' && (
                <div className="tab-view active gacha-view">
                  <div className="gacha-top">
                    <span style={{color:'var(--pixel-yellow)', fontSize:'6px'}}>CRYSTALS: {manaCrystals}</span>
                    <button className="gacha-btn" onClick={handleSummon}>SUMMON</button>
                  </div>
                  <div className="inventory-list">
                    {gachaInventory.map(skill => (
                      <div key={skill.id} className="inv-item">
                        <span>{skill.icon} {skill.name}</span>
                        <button className="equip-btn" onClick={() => {
                          if (equippedIds.includes(skill.id)) setEquippedIds(equippedIds.filter(id => id !== skill.id));
                          else if (equippedIds.length < 3) setEquippedIds([...equippedIds, skill.id]);
                          else notify("Max 3 Skills!");
                        }}>
                          {equippedIds.includes(skill.id) ? 'UNEQUIP' : 'EQUIP'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeMenu === 'settings' && (
                <div className="tab-view active settings-view">
                  <div style={{color:'var(--pixel-yellow)', fontSize:'6px', textAlign:'center', marginBottom:'10px'}}>SETTINGS</div>
                  
                  <label style={{fontSize:'5px', color:'var(--text-dim)'}}>GEMINI API KEY:</label>
                  <input type="password" value={apiKey} onChange={e => { setApiKey(e.target.value); localStorage.setItem('mofu_apikey', e.target.value); }} className="settings-input" placeholder="AIza..." style={{marginBottom: '15px'}}/>
                  
                  <div className="glass-panel" style={{marginBottom: '1rem', padding: '10px', border: '1px solid #1a1a0a', borderRadius: '4px'}}>
                      <p style={{color: 'var(--text-dim)', fontSize: '5px', marginBottom: '8px'}}>SELECT_CORE_ENGINE:</p>
                      <div className="model-chip-group">
                          <button className={`model-chip ${geminiModel === 'gemini-2.0-flash' ? 'active' : ''}`} onClick={() => {setGeminiModel('gemini-2.0-flash'); localStorage.setItem('mofu_model', 'gemini-2.0-flash');}}>2.0_FLASH</button>
                          <button className={`model-chip ${geminiModel === 'gemini-2.5-flash' ? 'active' : ''}`} onClick={() => {setGeminiModel('gemini-2.5-flash'); localStorage.setItem('mofu_model', 'gemini-2.5-flash');}}>2.5_FLASH</button>
                          <button className={`model-chip ${geminiModel === 'gemini-2.5-pro' ? 'active' : ''}`} onClick={() => {setGeminiModel('gemini-2.5-pro'); localStorage.setItem('mofu_model', 'gemini-2.5-pro');}}>2.5_PRO</button>
                          <button className={`model-chip ${geminiModel === 'gemini-3.0-flash-preview' ? 'active' : ''}`} onClick={() => {setGeminiModel('gemini-3.0-flash-preview'); localStorage.setItem('mofu_model', 'gemini-3.0-flash-preview');}}>3.0_FLASH</button>
                      </div>
                  </div>
                </div>
              )}

              {activeMenu === 'boss' && !battleState && (
                <div className="tab-view active boss-select-screen">
                  <div className="boss-list-title">⚔ WANTED BOARD ⚔</div>
                  <button className="gacha-btn scan-btn" onClick={generateAIBoss} disabled={isGeneratingBoss}>
                    {isGeneratingBoss ? "SCANNING..." : "📡 SCAN FOR AI THREAT"}
                  </button>
                  <div className="boss-cards">
                    {bosses.slice().reverse().map(b => (
                      <div key={b.id} className={`boss-card ${pet.level < b.reqLevel ? 'locked' : ''}`} onClick={() => startBattle(b)}>
                        <div className="boss-emoji">{b.emoji}</div>
                        <div className="boss-info">
                          <div className="boss-name">{b.name}</div>
                          <div className="boss-req">REQ: LV.{b.reqLevel} | HP: {b.hp}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeMenu === 'battle' && battleState && (
                <div className="tab-view active battle-screen">
                  <div className="battle-header">VS {battleState.boss.name}</div>
                  <div className="combatants">
                    <div className="combatant">
                      <div className={`cat-sprite ${character.spriteClass}`} style={{transform: 'scale(0.8)'}}></div>
                      <div className="hp-track"><div className="hp-fill pet-hp" style={{width: `${(battleState.petHp/battleState.petMaxHp)*100}%`}}></div></div>
                    </div>
                    <div className="vs-badge">VS</div>
                    <div className="combatant">
                      <div className="combatant-sprite">{battleState.boss.emoji}</div>
                      <div className="hp-track"><div className="hp-fill boss-hp" style={{width: `${(battleState.bossHp/battleState.boss.hp)*100}%`}}></div></div>
                    </div>
                  </div>
                  
                  <div className="battle-log">
                    {combatLog.map((l, i) => <div key={i} className="log-line system">{l}</div>)}
                  </div>

                  <div className="skill-row">
                    {equippedSkills.map(sk => {
                      const cd = battleState.cooldowns[sk.id] > 0;
                      return (
                        <button key={sk.id} className="skill-btn" disabled={battleState.turn !== 'player' || cd} onClick={() => useSkill(sk)}>
                          <span>{sk.icon} {sk.name}</span>
                          {cd && <span style={{color:'var(--pixel-red)'}}>CD: {battleState.cooldowns[sk.id]}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="controls">
          <div className="dpad">
            <div></div><button className="dpad-btn" onClick={() => dpadAction('up')}>▲</button><div></div>
            <button className="dpad-btn" onClick={() => dpadAction('left')}>◀</button><div className="dpad-center"></div><button className="dpad-btn" onClick={() => dpadAction('right')}>▶</button>
            <div></div><button className="dpad-btn" onClick={() => dpadAction('down')}>▼</button><div></div>
          </div>
          <div className="action-buttons">
            <button className="action-btn btn-feed" onClick={() => handlePetAction('feed')}>🍖</button>
            <button className="action-btn btn-play" onClick={() => handlePetAction('play')}>🧶</button>
            <button className="action-btn btn-sleep" onClick={() => handlePetAction('sleep')}>💤</button>
            <button className="action-btn btn-talk" onClick={() => setActiveMenu('chat')}>💬</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
