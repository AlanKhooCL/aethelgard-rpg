# 🦡 Tracker of Magic

**Tracker of Magic** is a gamified, RPG-style learning tracker built to make self-study rewarding. Powered by a live Google Sheets backend, this React web application transforms real-world learning milestones into in-game Experience Points (EXP), Mana Crystals, and magical evolutions. 

Dressed in a cozy but dangerous Hufflepuff aesthetic (pitch blacks, charcoal grays, and badger-gold), the app features a retro Digivice-style interface where your real-world progress directly fuels your virtual familiar's magical power.

---

## ✨ Core Features & Progression

### 📚 1. Real-World Sync (The Google Sheets Backend)
Your actual learning progress is managed in a separate Learning Center (Google Sheets). 
* **Live Syncing:** By clicking the **🔄 Sync** button on the Digivice, the app fetches the latest CSV data from Google Sheets, utilizing a timestamp cache-buster to ensure instant updates.
* **EXP Gains:** Every completed chapter grants **50 EXP**. Completing a full course grants a massive **500 EXP** bonus.

### 🐾 2. Evolving Familiar (Virtual Pet)
Your companion is a custom pixel-art Golden British Shorthair cat that grows alongside your knowledge. The familiar features a retro "idle bounce" animation and evolves through 5 distinct Hogwarts-themed stages based on your Level:
1. **First-Year (Lv 1-4):** Sleeping kitten.
2. **Fifth-Year (Lv 5-9):** Awake and exploring.
3. **Prefect (Lv 10-14):** Wielding a beginner's wand.
4. **Auror (Lv 15-19):** Battle-ready with a defensive shield and cloak.
5. **Order Member (Lv 20+):** The ultimate Champion form, standing bipedal with a magical staff and golden aura.

### 📜 3. Grimoire Gacha System
Knowledge is power. Every chapter you complete in real life earns you **1 Mana Crystal**.
* **Summoning:** Spend 1 Mana Crystal to pull a random spell from the Grimoire.
* **Tech/Magic Tiers:** Spells are tech-themed (e.g., *Console.log()*, *SQL Query*, *Neural Network*) and drop in 4 rarities: **Common**, **Rare**, **Epic**, and **Legendary**.
* **Loadout:** Rest at the Inn to reset your spells, then equip up to 3 active spells to temporarily boost your Combat Power for the next duel.

### ☠️ 4. Harry Potter Endless Auto-Battler
Test your magical prowess against an endless, procedurally generated gauntlet of Wizarding World threats.
* **Dynamic Generation:** Fight randomized enemies (e.g., *The Cursed Boggart*, *The Spectral Dementor*) in iconic locations (*The Forbidden Forest*, *Azkaban*).
* **Auto-Battler UI:** Engage in an automated duel with combat logs, retro health bars, and attack animations.
* **Progression Blockers:** If your Level + Equipped Spell Power isn't high enough to defeat the boss, you will be defeated and forced to return to your real-world studies to level up!

---

## 🛠️ Tech Stack & Architecture

* **Frontend:** React.js, standard HTML/CSS.
* **Styling:** Custom CSS Sprite Engine for pixel-art animations, CSS Keyframes, Flexbox/Grid for the retro Digivice UI, fully responsive for mobile.
* **Backend / Database:** Google Sheets (Published to Web as CSV) handled via the Javascript `Fetch` API.
* **Hosting:** GitHub Pages.
* **Development Environment:** GitHub Codespaces (Mobile-friendly development workflow).

---

## 🚀 Local Setup & Development

If you want to run this project locally or in a Codespace:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
