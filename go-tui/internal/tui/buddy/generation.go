package buddy

import (
	"hash/fnv"
	"math"
)

func hashString(s string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(s))
	return h.Sum32()
}

type mulberry32 struct {
	state uint32
}

func newMulberry32(seed uint32) *mulberry32 {
	return &mulberry32{state: seed}
}

func (m *mulberry32) next() float64 {
	m.state += 0x6d2b79f5
	t := m.state
	t = uint32(int32(t)*int32(t^(t>>15)) | 0)
	t = uint32(int32(t)*int32(t^(t>>7)) | 0)
	t = t ^ (t >> 14)
	return float64(t) / 4294967296.0
}

func pick(rng *mulberry32, arr []string) string {
	idx := int(math.Floor(rng.next() * float64(len(arr))))
	if idx >= len(arr) {
		idx = len(arr) - 1
	}
	return arr[idx]
}

func pickStat(rng *mulberry32, arr []string) string {
	idx := int(math.Floor(rng.next() * float64(len(arr))))
	if idx >= len(arr) {
		idx = len(arr) - 1
	}
	return arr[idx]
}

func rollRarity(rng *mulberry32) string {
	total := 0
	for _, w := range RarityWeights {
		total += w
	}
	roll := rng.next() * float64(total)
	for _, rarity := range Rarities {
		roll -= float64(RarityWeights[rarity])
		if roll < 0 {
			return rarity
		}
	}
	return "common"
}

func rollStats(rng *mulberry32, rarity string) map[string]int {
	floor := RarityFloor[rarity]
	peak := pickStat(rng, StatNames)
	dump := pickStat(rng, StatNames)
	for dump == peak {
		dump = pickStat(rng, StatNames)
	}

	stats := make(map[string]int)
	for _, name := range StatNames {
		switch name {
		case peak:
			stats[name] = min(100, floor+50+int(rng.next()*30))
		case dump:
			stats[name] = max(1, floor-10+int(rng.next()*15))
		default:
			stats[name] = floor + int(rng.next()*40)
		}
	}
	return stats
}

type Bones struct {
	Species string         `json:"species"`
	Rarity  string         `json:"rarity"`
	Eye     string         `json:"eye"`
	Hat     string         `json:"hat"`
	Shiny   bool           `json:"shiny"`
	Stats   map[string]int `json:"stats"`
}

type RollResult struct {
	Bones           Bones
	InspirationSeed int
}

func RollFrom(rng *mulberry32) RollResult {
	rarity := rollRarity(rng)
	hat := "none"
	if rarity != "common" {
		hat = pick(rng, Hats)
	}

	bones := Bones{
		Rarity:  rarity,
		Species: pick(rng, Species),
		Eye:     pick(rng, Eyes),
		Hat:     hat,
		Shiny:   rng.next() < 0.01,
		Stats:   rollStats(rng, rarity),
	}

	inspirationSeed := int(rng.next() * 1e9)

	return RollResult{
		Bones:           bones,
		InspirationSeed: inspirationSeed,
	}
}

func Roll(userID, salt string) RollResult {
	key := userID + salt
	h := hashString(key)
	rng := newMulberry32(h)
	return RollFrom(rng)
}
