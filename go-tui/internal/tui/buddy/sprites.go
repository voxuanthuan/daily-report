package buddy

import "strings"

type SpriteFrames [3][5]string

var bodies = map[string]SpriteFrames{
	"duck": {
		{
			"               ",
			"     __         ",
			" <:({E} )___   ",
			"  (  ._>  )    ",
			"   `----'      ",
		},
		{
			"               ",
			"     __         ",
			" <:({E} )___   ",
			"  (  ._>  )    ",
			"   `----'~     ",
		},
		{
			"               ",
			"     __         ",
			" <:({E} )___   ",
			"  (  .__> )    ",
			"   `----'      ",
		},
	},
	"goose": {
		{
			"               ",
			"   ({E}>>>>    ",
			"     |||       ",
			"   _(___)_     ",
			"    `---'      ",
		},
		{
			"               ",
			"  ({E}>>>>>    ",
			"     |||       ",
			"   _(___)_     ",
			"    `---'      ",
		},
		{
			"               ",
			"   ({E}>>>>    ",
			"     |||       ",
			"   _(___)_     ",
			"    `^^^'      ",
		},
	},
	"blob": {
		{
			"               ",
			"   .------.    ",
			" ( {E}  {E} )  ",
			" (        )   ",
			"  `------'    ",
		},
		{
			"               ",
			"  .--------.   ",
			"(  {E}  {E}  )  ",
			"(          )  ",
			" `--------'   ",
		},
		{
			"               ",
			"     .--.      ",
			"    ({E}{E})    ",
			"    (    )     ",
			"     `--'      ",
		},
	},
	"cat": {
		{
			"               ",
			"   /\\_/\\       ",
			" ( {E}  {E} )  ",
			" (  w   w )   ",
			"  (\")_(\")      ",
		},
		{
			"               ",
			"   /\\_/\\       ",
			" ( {E}  {E} )  ",
			" (  w   w )   ",
			"  (\")_(\")~     ",
		},
		{
			"               ",
			"  /\\-/\\-/\\     ",
			" ( {E}  {E} )  ",
			" (  w   w )   ",
			"  (\")_(\")      ",
		},
	},
	"dragon": {
		{
			"               ",
			" /^\\   /^\\     ",
			"< {E}  {E}  >  ",
			"(    ~~     )  ",
			" `-vvvvvv-'   ",
		},
		{
			"               ",
			" /^\\   /^\\     ",
			"< {E}  {E}  >  ",
			"(  ~~ ~~ ~~ )  ",
			" `-vvvvvv-'   ",
		},
		{
			"  ~       ~    ",
			" /^\\   /^\\     ",
			"< {E}  {E}  >  ",
			"(           )  ",
			" `-vvvvvv-'   ",
		},
	},
	"octopus": {
		{
			"               ",
			"   .------.    ",
			" ( {E}  {E} )  ",
			" (________)    ",
			" /\\/\\/\\/\\     ",
		},
		{
			"               ",
			"   .------.    ",
			" ( {E}  {E} )  ",
			" (________)    ",
			" \\/\\/\\/\\/     ",
		},
		{
			"     o          ",
			"   .------.    ",
			" ( {E}  {E} )  ",
			" (________)    ",
			" /\\/\\/\\/\\     ",
		},
	},
	"owl": {
		{
			"               ",
			"  /\\   /\\      ",
			"(({E})({E}))    ",
			" (  ><    )    ",
			"  `------'    ",
		},
		{
			"               ",
			"  /\\   /\\      ",
			"(({E})({E}))    ",
			" (  ><    )    ",
			"  .------.    ",
		},
		{
			"               ",
			"  /\\   /\\      ",
			"(({E})(-))      ",
			" (  ><    )    ",
			"  `------'    ",
		},
	},
	"penguin": {
		{
			"               ",
			"   .----.      ",
			"  ({E}> {E})    ",
			" /(      )\\   ",
			"  `----'      ",
		},
		{
			"               ",
			"   .----.      ",
			"  ({E}> {E})    ",
			" |(      )|   ",
			"  `----'      ",
		},
		{
			"   .----.      ",
			"  ({E}> {E})    ",
			" /(      )\\   ",
			"  `----'      ",
			"    ~  ~       ",
		},
	},
	"turtle": {
		{
			"               ",
			"  _,----._     ",
			" ( {E}  {E} )  ",
			"/[________]\\  ",
			" ``      ``   ",
		},
		{
			"               ",
			"  _,----._     ",
			" ( {E}  {E} )  ",
			"/[________]\\  ",
			"  ``  ``      ",
		},
		{
			"               ",
			"  _,----._     ",
			" ( {E}  {E} )  ",
			"/[========]\\  ",
			" ``      ``   ",
		},
	},
	"snail": {
		{
			"               ",
			"{E}   .---.    ",
			"  \\  ( @ )    ",
			"   \\_`--'     ",
			"  ~~~~~~~~~    ",
		},
		{
			"               ",
			" {E}  .---.    ",
			"  |  ( @ )    ",
			"   \\_`--'     ",
			"  ~~~~~~~~~    ",
		},
		{
			"               ",
			"{E}   .---.    ",
			"  \\ ( @  )   ",
			"   \\_`--'     ",
			"   ~~~~~~~~    ",
		},
	},
	"ghost": {
		{
			"               ",
			"  .--------.   ",
			" / {E}  {E} \\   ",
			" |        |   ",
			" ~`~``~`~`~   ",
		},
		{
			"               ",
			"  .--------.   ",
			" / {E}  {E} \\   ",
			" |        |   ",
			" `~`~~`~`~`   ",
		},
		{
			"     ~   ~     ",
			"  .--------.   ",
			" / {E}  {E} \\   ",
			" |        |   ",
			" ~~`~~`~~`~   ",
		},
	},
	"axolotl": {
		{
			"               ",
			"}(_______){    ",
			"}({E} .. {E}){   ",
			" ( .--. )     ",
			" (_/  \\_)     ",
		},
		{
			"               ",
			"{(_______)}    ",
			"{({E} .. {E})}   ",
			" ( .--. )     ",
			" (_/  \\_)     ",
		},
		{
			"               ",
			"}(_______){    ",
			"}({E} .. {E}){   ",
			" (  ---  )    ",
			" ~_/  \\_~     ",
		},
	},
	"capybara": {
		{
			"               ",
			" n_______n     ",
			"( {E}   {E} )   ",
			"(  oo  oo  )  ",
			" `-------'    ",
		},
		{
			"               ",
			" n_______n     ",
			"( {E}   {E} )   ",
			"(  Oo  oO  )  ",
			" `-------'    ",
		},
		{
			"    ~   ~       ",
			" u_______n     ",
			"( {E}   {E} )   ",
			"(  oo  oo  )  ",
			" `-------'    ",
		},
	},
	"cactus": {
		{
			"               ",
			"n  ____  n    ",
			"| |{E} {E}| |    ",
			"|_|      |_|  ",
			"  |      |    ",
		},
		{
			"               ",
			"   ____        ",
			"n |{E} {E}| n    ",
			"|_|      |_|  ",
			"  |      |    ",
		},
		{
			" n         n   ",
			" |  ____  |   ",
			" | |{E} {E}| |   ",
			" |_|      |_|  ",
			"   |      |    ",
		},
	},
	"robot": {
		{
			"               ",
			"  .[||||].    ",
			" [ {E}  {E} ]  ",
			" [ ====== ]   ",
			" `--------'   ",
		},
		{
			"               ",
			"  .[||||].    ",
			" [ {E}  {E} ]  ",
			" [ -====- ]   ",
			" `--------'   ",
		},
		{
			"      *        ",
			"  .[||||].    ",
			" [ {E}  {E} ]  ",
			" [ ====== ]   ",
			" `--------'   ",
		},
	},
	"rabbit": {
		{
			"               ",
			"  (\\____/)     ",
			" ( {E}  {E} )  ",
			"=(  ..   )=   ",
			" (\")__(\")      ",
		},
		{
			"               ",
			"  (|____/)     ",
			" ( {E}  {E} )  ",
			"=(  ..   )=   ",
			" (\")__(\")      ",
		},
		{
			"               ",
			"  (\\____/)     ",
			" ( {E}  {E} )  ",
			"=( .   .  )=  ",
			" (\")__(\")      ",
		},
	},
	"mushroom": {
		{
			"               ",
			".--o-OO-o--.  ",
			"(__________)   ",
			"  |{E} {E}|      ",
			"  |______|     ",
		},
		{
			"               ",
			".--O-oo-O--.  ",
			"(__________)   ",
			"  |{E} {E}|      ",
			"  |______|     ",
		},
		{
			"   .  o  .     ",
			".--o-OO-o--.  ",
			"(__________)   ",
			"  |{E} {E}|      ",
			"  |______|     ",
		},
	},
	"chonk": {
		{
			"               ",
			" /\\      /\\   ",
			"( {E}   {E}  )  ",
			"(   ..    )   ",
			" `--------'   ",
		},
		{
			"               ",
			" /\\      |\\   ",
			"( {E}   {E}  )  ",
			"(   ..    )   ",
			" `--------'   ",
		},
		{
			"               ",
			" /\\      /\\   ",
			"( {E}   {E}  )  ",
			"(   ..    )   ",
			" `--------'~  ",
		},
	},
}

var hatLines = map[string]string{
	"none":      "",
	"crown":     "   \\^^^^^/    ",
	"tophat":    "   [____]    ",
	"propeller": "    --+--     ",
	"halo":      "   (    )    ",
	"wizard":    "    /^\\^^/\\   ",
	"beanie":    "   (____)    ",
	"tinyduck":  "     ,>      ",
}

func RenderSprite(bones Bones, frame int) []string {
	frames, ok := bodies[bones.Species]
	if !ok {
		return []string{"  ???  "}
	}

	framesSlice := [3][5]string(frames)
	bodyFrame := framesSlice[frame%3]

	body := make([]string, len(bodyFrame))
	for i, line := range bodyFrame {
		body[i] = strings.ReplaceAll(line, "{E}", bones.Eye)
	}

	lines := make([]string, len(body))
	copy(lines, body)

	if bones.Hat != "none" {
		if hatLine, ok := hatLines[bones.Hat]; ok && hatLine != "" && strings.TrimSpace(lines[0]) == "" {
			lines[0] = hatLine
		}
	}

	allEmpty := true
	for _, f := range bodies[bones.Species] {
		if strings.TrimSpace(f[0]) != "" {
			allEmpty = false
			break
		}
	}
	if allEmpty && strings.TrimSpace(lines[0]) == "" {
		lines = lines[1:]
	}

	return lines
}

func SpriteFrameCount(species string) int {
	return 3
}

func RenderFace(species, eye string) string {
	switch species {
	case "duck", "goose":
		return "(" + eye + ">"
	case "blob":
		return "(" + eye + eye + ")"
	case "cat":
		return "=" + eye + "w" + eye + "="
	case "dragon":
		return "<" + eye + "~" + eye + ">"
	case "octopus":
		return "~(" + eye + eye + ")~"
	case "owl":
		return "(" + eye + ")(" + eye + ")"
	case "penguin":
		return "(" + eye + ">)"
	case "turtle":
		return "[" + eye + "_" + eye + "]"
	case "snail":
		return eye + "(@)"
	case "ghost":
		return "/" + eye + eye + "\\"
	case "axolotl":
		return "}" + eye + "." + eye + "{"
	case "capybara":
		return "(" + eye + "oo" + eye + ")"
	case "cactus":
		return "|" + eye + "  " + eye + "|"
	case "robot":
		return "[" + eye + eye + "]"
	case "rabbit":
		return "(" + eye + ".." + eye + ")"
	case "mushroom":
		return "|" + eye + "  " + eye + "|"
	case "chonk":
		return "(" + eye + "." + eye + ")"
	default:
		return "(" + eye + eye + ")"
	}
}
