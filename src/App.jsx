import { useEffect, useState, useRef } from 'react';
import { fetchAethelgardData } from './api/grimoire';
import './App.css';

// --- CHINESE HISTORY FACTS ---
const CHINA_HISTORY_FACTS = [
  "The Great Wall of China is not a single continuous wall, but a series of walls and fortifications built by different dynasties over two millennia.",
  "The Terracotta Army was discovered by local farmers in 1974. It contains over 8,000 unique, life-sized soldiers built to protect China's first emperor in the afterlife.",
  "Paper, printing, the compass, and gunpowder are known as the Four Great Inventions of ancient China, profoundly shaping the modern world.",
  "The Forbidden City in Beijing contains 9,999 rooms. The number 9 is associated with the Emperor, representing longevity and eternity.",
  "During the Tang Dynasty, the civil service examinations were deeply rooted in Confucian texts, creating a meritocratic system for government officials.",
  "Empress Wu Zetian is the only woman in the history of China to assume the title of Empress Regnant, ruling during the Tang Dynasty.",
  "The Silk Road was established during the Han Dynasty, creating a massive trade network that connected China with the Mediterranean.",
  "Tea was discovered in China. According to legend, Emperor Shen Nong discovered it in 2737 BCE when tea leaves accidentally blew into his boiling water.",
  "The Tang Dynasty (618–907 AD) is often considered the golden age of Chinese poetry and art, producing legendary poets like Li Bai and Du Fu.",
  "Zheng He was a legendary Ming Dynasty admiral who led seven epic voyages of discovery, reaching as far as the Middle East and Africa long before European explorers."
];

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

const EVOLUTIONS = [
  { stage: "First-Year", cls: "cat-stage-1", lvl: 1 },
  { stage: "Fifth-Year", cls: "cat-stage-2", lvl: 5 },
  { stage: "Prefect", cls: "cat-stage-3", lvl: 10 },
  { stage: "Auror", cls: "cat-stage-3", lvl: 15 },
  { stage: "Order Member", cls: "cat-stage-4", lvl: 20 }
];

const getCharacterEvolution = (level) => {
  let currentEvo = EVOLUTIONS[0];
  for (let i = EVOLUTIONS.length - 1; i >= 0; i--) {
    if (level >= EVOLUTIONS[i].lvl) {
      currentEvo = EVOLUTIONS[i];
      break;
    }
  }
  return currentEvo;
};

function App() {
  const [apiKey, setApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3.0-flash-preview");
  const [sheetsData, setSheetsData] = useState({ completedChaptersCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [sysMessage, setSysMessage] = useState("");

  const [pet, setPet] = useState({ name: "MIKAN", exp: 0, level: 1, rebirths: 0 });
  const [bosses, setBosses] = useState([
    { id: 'arlong', name: 'Saw-Tooth Arlong', emoji: '🦈', hp: 120, atk: 15, def: 5, reqLevel: 1, lore: 'A ruthless fish-man pirate.' },
    { id: 'crocodile', name: 'Sir Crocodile', emoji: '🐊', hp: 300, atk: 25, def: 15, reqLevel: 5, lore: 'Leader of Baroque Works.' }
  ]);
  
  const [activeMenu, setActiveMenu] = useState('home'); 
  const [isGeneratingBoss, setIsGeneratingBoss] = useState(false);

  const [gachaInventory, setGachaInventory] = useState([]);
  const [equippedIds, setEquippedIds] = useState([]);
  const [totalRolls, setTotalRolls] = useState(0);

  const [battleState, setBattleState] = useState(null);
  const [postBattleFact, setPostBattleFact] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const logContainerRef = useRef(null);

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

  const gainExp = (amount) => {
    setPet(p => {
      const newExp = p.exp + amount;
      const newLevel = Math.floor(Math.sqrt(newExp / 100)) + 1;
      return { ...p, exp: newExp, level: newLevel };
    });
  };

  const patPet = () => {
    notify(`You patted ${pet.name}! +2 EXP`);
    gainExp(2);
  };

  const handleRebirth = () => {
    if (pet.level < 20) return;
    setPet(p => ({ ...p, level: 1, exp: 0, rebirths: (p.rebirths || 0) + 1 }));
    const pool = SKILL_POOL['legendary'];
    const pulledSkill = { ...pool[Math.floor(Math.random() * pool.length)], tier: 'legendary', id: Date.now().toString() };
    setGachaInventory(prev => [pulledSkill, ...prev]);
    notify("✨ REBORN! LEGENDARY SKILL ACQUIRED! ✨");
  };

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
      Do not include markdown tags.`;
      
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
      notify("Failed to locate threat. Try again.");
    } finally {
      setIsGeneratingBoss(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !apiKey) { notify(!apiKey ? "Missing API Key!" : "Type a message!"); return; }
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatLog(prev => [...prev, { sender: 'user', text: userMsg }]);
    
    try {
      // Increased maxOutputTokens to 400 to prevent cutoffs
      const prompt = `You are my virtual pet cat named MIKAN, a Golden British Shorthair. You are at level ${pet.level}. The user says: "${userMsg}". Respond in character. Give a friendly, engaging response of 2 to 3 complete sentences. Do not cut off your sentences. Use plain English and emojis. Do not output markdown or code formatting.`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 400, temperature: 0.7 } })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Meow!";
      
      setChatLog(prev => [...prev, { sender: 'pet', text: reply }]);
      gainExp(25);
    } catch (e) {
      setChatLog(prev => [...prev, { sender: 'pet', text: `*hisses* Connection failed: ${e.message}` }]);
    }
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

  // Turn Processing
  useEffect(() => {
    if (activeMenu === 'battle' && battleState?.turn === 'boss') {
      if (battleState.bossHp <= 0) {
        setCombatLog(prev => [...prev, `🏆 ${battleState.boss.name} defeated! +500 EXP!`]);
        gainExp(500);
        
        // Trigger the Historical Fact pop-up
        setTimeout(() => {
          const randomFact = CHINA_HISTORY_FACTS[Math.floor(Math.random() * CHINA_HISTORY_FACTS.length)];
          setPostBattleFact(randomFact);
        }, 1000);
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

  const closeFactModal = () => {
    setPostBattleFact(null);
    setActiveMenu('boss');
    setBattleState(null);
  };

  if (isLoading) return <div style={{color:'#FFDB00', textAlign:'center', marginTop:'50px'}}>Booting OS...</div>;

  const character = getCharacterEvolution(pet.level);
  const manaCrystals = Math.max(0, sheetsData.completedChaptersCount - totalRolls);
  const equippedSkills = gachaInventory.filter(skill => equippedIds.includes(skill.id));
  
  const baseExpForCurrentLevel = Math.pow(pet.level - 1, 2) * 100;
  const baseExpForNextLevel = Math.pow(pet.level, 2) * 100;
  const progressPercentage = Math.min(((pet.exp - baseExpForCurrentLevel) / (baseExpForNextLevel - baseExpForCurrentLevel)) * 100, 100);

  return (
    <div className="rpg-container">
      <div className="device">
        
        <div className="device-top">
          <span className="brand">POCKETPAL OS</span>
          <div className="led"></div>
          <div className="top-nav-actions">
            <a href="https://alankhoocl.github.io/AI-Learning-Management/" target="_blank" rel="noopener noreferrer" className="alan-btn">📚 A.L.A.N</a>
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
              
              {/* HOME MENU */}
              {activeMenu === 'home' && (
                <div className="tab-view active">
                  <div className="pet-stage" onClick={patPet}>
                    <div className={`cat-sprite ${character.cls}`}></div>
                  </div>
                  
                  <div className="exp-bar-container">
                    <div className="exp-labels"><span>EXP</span><span>{pet.exp} / {baseExpForNextLevel}</span></div>
                    <div className="exp-track"><div className="exp-fill" style={{width: `${progressPercentage}%`}}></div></div>
                  </div>

                  <div className="evolution-tracker">
                    <div className="evo-title">EVOLUTION PATH</div>
                    <div className="evo-path">
                      {EVOLUTIONS.map((evo) => {
                        const isUnlocked = pet.level >= evo.lvl;
                        const isCurrent = character.stage === evo.stage;
                        return (
                          <div key={evo.stage} className={`evo-step ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'active-step' : ''}`}>
                             <div className="evo-left">
                               <div className={`cat-sprite-mini ${evo.cls}`}></div>
                               <span className="evo-name">{evo.stage}</span>
                             </div>
                             <span className="evo-lvl">LV.{evo.lvl}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {pet.level >= 20 && (
                    <button className="rebirth-btn" onClick={handleRebirth}>✨ REBIRTH (LVL 20+) ✨</button>
                  )}
                </div>
              )}

              {/* CHAT MENU */}
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

              {/* GACHA MENU */}
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

              {/* SETTINGS MENU */}
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

              {/* BOSS MENU */}
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

              {/* BATTLE SCREEN */}
              {activeMenu === 'battle' && battleState && (
                <div className="tab-view active battle-screen">
                  
                  {postBattleFact && (
                    <div className="fact-modal-overlay">
                      <div className="fact-modal">
                        <h3 className="fact-title">🎉 THREAT DEFEATED! 🎉</h3>
                        <p className="fact-subtitle">Knowledge from the Archives:</p>
                        <p className="fact-text">"{postBattleFact}"</p>
                        <button className="gacha-btn fact-btn" onClick={closeFactModal}>Close & Continue</button>
                      </div>
                    </div>
                  )}

                  <div className="battle-header">VS {battleState.boss.name}</div>
                  <div className="combatants">
                    <div className="combatant">
                      <div className={`cat-sprite ${character.cls}`} style={{transform: 'scale(0.8)'}}></div>
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
                        <button key={sk.id} className="skill-btn" disabled={battleState.turn !== 'player' || cd || postBattleFact} onClick={() => useSkill(sk)}>
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
      </div>
    </div>
  );
}

export default App;
