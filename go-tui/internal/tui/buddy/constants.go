package buddy

var Species = []string{
	"duck", "goose", "blob", "cat", "dragon", "octopus",
	"owl", "penguin", "turtle", "snail", "ghost", "axolotl",
	"capybara", "cactus", "robot", "rabbit", "mushroom", "chonk",
}

var Rarities = []string{"common", "uncommon", "rare", "epic", "legendary"}

var RarityWeights = map[string]int{
	"common":    60,
	"uncommon":  25,
	"rare":      10,
	"epic":      4,
	"legendary": 1,
}

var RarityStars = map[string]string{
	"common":    "★",
	"uncommon":  "★★",
	"rare":      "★★★",
	"epic":      "★★★★",
	"legendary": "★★★★★",
}

var RarityFloor = map[string]int{
	"common":    5,
	"uncommon":  15,
	"rare":      25,
	"epic":      35,
	"legendary": 50,
}

var Eyes = []string{"·", "✦", "×", "◉", "@", "°"}

var Hats = []string{"none", "crown", "tophat", "propeller", "halo", "wizard", "beanie", "tinyduck"}

var StatNames = []string{"DEBUGGING", "PATIENCE", "CHAOS", "WISDOM", "SNARK"}
