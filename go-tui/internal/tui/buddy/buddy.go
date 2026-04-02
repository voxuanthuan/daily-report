package buddy

import (
	"encoding/json"
	"math/rand"
	"os"
	"path/filepath"
	"time"
)

type BuddyConfig struct {
	Species string `json:"species"`
	Rarity  string `json:"rarity"`
	Eye     string `json:"eye"`
	Hat     string `json:"hat"`
	Name    string `json:"name"`
}

type Buddy struct {
	Bones        Bones
	Frame        int
	Visible      bool
	Name         string
	Speech       string
	SpeechTime   time.Time
	LastActivity time.Time
	IdleStage    int
	WelcomeShown bool
}

var nameAdjectives = []string{
	"Little", "Tiny", "Fluffy", "Brave", "Sleepy",
	"Happy", "Grumpy", "Silly", "Cozy", "Sparky",
	"Lucky", "Bouncy", "Chill", "Cheeky", "Zany",
	"Dizzy", "Fuzzy", "Peppy", "Witty", "Snoozy",
}

var nameNouns = []string{
	"Bean", "Mochi", "Noodle", "Pixel", "Waffles",
	"Biscuit", "Pudding", "Dumpling", "Sprout", "Pebble",
	"Muffin", "Cloud", "Berry", "Button", "Toast",
	"Nuggie", "Pickle", "Tofu", "Naps", "Zest",
}

func generateName(rng *rand.Rand) string {
	adj := nameAdjectives[rng.Intn(len(nameAdjectives))]
	noun := nameNouns[rng.Intn(len(nameNouns))]
	return adj + noun
}

func NewBuddy(username string) *Buddy {
	cfg := loadBuddyConfig()
	if cfg != nil && cfg.Species != "" {
		return &Buddy{
			Bones: Bones{
				Species: cfg.Species,
				Rarity:  cfg.Rarity,
				Eye:     cfg.Eye,
				Hat:     cfg.Hat,
			},
			Frame:        0,
			Visible:      true,
			Name:         cfg.Name,
			LastActivity: time.Now(),
		}
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	result := RollFrom(newMulberry32(rng.Uint32()))
	name := generateName(rng)
	b := &Buddy{
		Bones:        result.Bones,
		Frame:        0,
		Visible:      true,
		Name:         name,
		LastActivity: time.Now(),
	}
	b.SaveConfig()
	return b
}

func (b *Buddy) Tick() {
	b.Frame = (b.Frame + 1) % SpriteFrameCount(b.Bones.Species)
}

func (b *Buddy) TriggerSpeech(action string) {
	messages := getSpeechMessages(action)
	if len(messages) > 0 {
		b.Speech = messages[rand.Intn(len(messages))]
		b.SpeechTime = time.Now()
	}
}

func (b *Buddy) ClearSpeech() {
	if !b.SpeechTime.IsZero() && time.Since(b.SpeechTime) > 5*time.Second {
		b.Speech = ""
		b.SpeechTime = time.Time{}
	}
}

func (b *Buddy) TouchActivity() {
	b.LastActivity = time.Now()
	b.IdleStage = 0
}

func (b *Buddy) WelcomeMessage() string {
	if b.WelcomeShown {
		return ""
	}
	b.WelcomeShown = true
	hour := time.Now().Hour()
	var msgs []string
	switch {
	case hour >= 5 && hour < 12:
		msgs = []string{
			"Good morning! Let's crush it!",
			"Rise and shine!",
			"Morning! Coffee first?",
			"Good morning! Ready for a great day?",
			"Hey there, early bird!",
		}
	case hour >= 12 && hour < 17:
		msgs = []string{
			"Good afternoon! Back at it!",
			"Hey! Ready to work?",
			"Afternoon! Let's do this!",
			"Good afternoon! How's it going?",
			"Hey! Halfway through the day!",
		}
	case hour >= 17 && hour < 21:
		msgs = []string{
			"Good evening! Still going?",
			"Evening session, nice!",
			"Late shift today?",
			"Good evening! Wrapping up?",
			"Hey! Burning the evening oil?",
		}
	case hour >= 21:
		msgs = []string{
			"Working late? Respect!",
			"Night owl mode!",
			"Burning the midnight oil?",
			"Still up? Don't overdo it!",
			"Late night hustle!",
		}
	default:
		msgs = []string{
			"It's past midnight...!",
			"You should be sleeping!",
			"Who needs sleep anyway?",
			"Midnight coding? Legendary!",
			"Go to bed! ...but first, one more task.",
		}
	}
	return msgs[rand.Intn(len(msgs))]
}

func (b *Buddy) CheckIdle() string {
	if b.Speech != "" {
		return ""
	}
	if b.LastActivity.IsZero() {
		b.LastActivity = time.Now()
		return ""
	}

	elapsed := time.Since(b.LastActivity)
	stage := 0
	var msgs []string

	switch {
	case elapsed >= 15*time.Minute:
		stage = 3
		msgs = []string{
			"I've been counting pixels...",
			"*yawns*",
			"I made a friend. He's a cursor.",
			"I named all the spaces. This one is Gerald.",
			"Hope you're having a nice moment away.",
			"I'll keep watch over your tasks.",
			"Zzz... oh! Just kidding. I don't sleep.",
		}
	case elapsed >= 8*time.Minute:
		stage = 2
		msgs = []string{
			"I'm getting lonely...",
			"Did you forget about me?",
			"I'll just wait here...",
			"Maybe grab some water?",
			"Your health > your tickets.",
			"A quick walk does wonders!",
			"Stretch time! Arms up!",
		}
	case elapsed >= 3*time.Minute:
		stage = 1
		msgs = []string{
			"Still there?",
			"Everything okay?",
			"Taking a break?",
			"Don't forget to stretch!",
			"Hey, you alright?",
			"I'm here whenever you need me.",
			"Taking a break is productive too!",
		}
	default:
		return ""
	}

	if stage <= b.IdleStage {
		return ""
	}
	b.IdleStage = stage
	return msgs[rand.Intn(len(msgs))]
}

func (b *Buddy) SaveConfig() {
	cfg := BuddyConfig{
		Species: b.Bones.Species,
		Rarity:  b.Bones.Rarity,
		Eye:     b.Bones.Eye,
		Hat:     b.Bones.Hat,
		Name:    b.Name,
	}
	saveBuddyConfig(&cfg)
}

func (b *Buddy) Reroll() {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	result := RollFrom(newMulberry32(rng.Uint32()))
	b.Bones = result.Bones
	b.Name = generateName(rng)
	b.Frame = 0
	b.SaveConfig()
}

func loadBuddyConfig() *BuddyConfig {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil
	}
	configPath := filepath.Join(homeDir, ".jira-daily-report.json")
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil
	}

	buddyData, ok := raw["buddy"]
	if !ok {
		return nil
	}

	var cfg BuddyConfig
	if err := json.Unmarshal(buddyData, &cfg); err != nil {
		return nil
	}
	return &cfg
}

func saveBuddyConfig(cfg *BuddyConfig) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return
	}
	configPath := filepath.Join(homeDir, ".jira-daily-report.json")

	var raw map[string]interface{}
	data, err := os.ReadFile(configPath)
	if err != nil {
		return
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return
	}

	raw["buddy"] = cfg

	out, err := json.MarshalIndent(raw, "", "  ")
	if err != nil {
		return
	}
	os.WriteFile(configPath, out, 0600)
}

func getSpeechMessages(action string) []string {
	messages := map[string][]string{
		"refresh": {
			"Fetching fresh data!",
			"Reloading... beep boop!",
			"Let me check for you!",
			"On it!",
		},
		"status_change": {
			"Status updated!",
			"Nice progress!",
			"One step closer!",
			"Moving right along!",
		},
		"log_time": {
			"Time logged!",
			"Great work today!",
			"Another productive session!",
			"Logged and loaded!",
		},
		"copy": {
			"Copied to clipboard!",
			"Report ready!",
			"All yours!",
			"Grabbed it for you!",
		},
		"open": {
			"Opening in browser!",
			"Here you go!",
			"Taking you there!",
		},
		"error": {
			"Oops! Something went wrong...",
			"Don't worry, we'll fix it!",
			"Hmm, that didn't work...",
		},
	}
	if msgs, ok := messages[action]; ok {
		return msgs
	}
	return messages["refresh"]
}
