package buddy

import "strings"

type SpriteFrames [3][5]string

var bodies = map[string]SpriteFrames{
	"duck": {
		{
			"            ",
			"    __      ",
			"  <({E} )___  ",
			"   (  ._>   ",
			"    `--'    ",
		},
		{
			"            ",
			"    __      ",
			"  <({E} )___  ",
			"   (  ._>   ",
			"    `--'~   ",
		},
		{
			"            ",
			"    __      ",
			"  <({E} )___  ",
			"   ( .__>   ",
			"    `--'    ",
		},
	},
	"goose": {
		{
			"            ",
			"     ({E}>    ",
			"     ||     ",
			"   _(__)_   ",
			"    ^^^^    ",
		},
		{
			"            ",
			"     ({E}>    ",
			"     ||     ",
			"   _(__)_   ",
			"    ^^^^    ",
		},
		{
			"            ",
			"    ({E}>>    ",
			"     ||     ",
			"   _(__)_   ",
			"    ^^^^    ",
		},
	},
	"blob": {
		{
			"            ",
			"   .----.   ",
			"  ( {E}  {E} )  ",
			"  (      )  ",
			"   `----'   ",
		},
		{
			"            ",
			"  .------.  ",
			" (  {E}  {E}  ) ",
			" (        ) ",
			"  `------'  ",
		},
		{
			"            ",
			"    .--.    ",
			"   ({E} {E})   ",
			"   (    )   ",
			"    `--'    ",
		},
	},
	"cat": {
		{
			"            ",
			"   /\\_/\\    ",
			"  ( {E}   {E})  ",
			"  (  \u03c9  )   ",
			"  (\")_(\")   ",
		},
		{
			"            ",
			"   /\\_/\\    ",
			"  ( {E}   {E})  ",
			"  (  \u03c9  )   ",
			"  (\")_(\")~  ",
		},
		{
			"            ",
			"   /\\-/\\    ",
			"  ( {E}   {E})  ",
			"  (  \u03c9  )   ",
			"  (\")_(\")   ",
		},
	},
	"dragon": {
		{
			"            ",
			"  /^\\  /^\\  ",
			" <  {E}  {E}  > ",
			" (   ~~   ) ",
			"  `-vvvv-'  ",
		},
		{
			"            ",
			"  /^\\  /^\\  ",
			" <  {E}  {E}  > ",
			" (        ) ",
			"  `-vvvv-'  ",
		},
		{
			"  ~    ~    ",
			"  /^\\  /^\\  ",
			" <  {E}  {E}  > ",
			" (   ~~   ) ",
			"  `-vvvv-'  ",
		},
	},
	"octopus": {
		{
			"            ",
			"   .----.   ",
			"  ( {E}  {E} )  ",
			"  (______)  ",
			"  /\\/\\/\\/\\  ",
		},
		{
			"            ",
			"   .----.   ",
			"  ( {E}  {E} )  ",
			"  (______)  ",
			"  \\/\\/\\/\\/  ",
		},
		{
			"     o      ",
			"   .----.   ",
			"  ( {E}  {E} )  ",
			"  (______)  ",
			"  /\\/\\/\\/\\  ",
		},
	},
	"owl": {
		{
			"            ",
			"   /\\  /\\   ",
			"  (({E})({E}))  ",
			"  (  ><  )  ",
			"   `----'   ",
		},
		{
			"            ",
			"   /\\  /\\   ",
			"  (({E})({E}))  ",
			"  (  ><  )  ",
			"   .----.   ",
		},
		{
			"            ",
			"   /\\  /\\   ",
			"  (({E})(-))   ",
			"  (  ><  )  ",
			"   `----'   ",
		},
	},
	"penguin": {
		{
			"            ",
			"   .---.    ",
			"  ({E}>{E})    ",
			" /(   )\\   ",
			"  `---'    ",
		},
		{
			"            ",
			"   .---.    ",
			"  ({E}>{E})    ",
			" |(   )|   ",
			"  `---'    ",
		},
		{
			"   .---.    ",
			"  ({E}>{E})    ",
			" /(   )\\   ",
			"  `---'    ",
			"   ~  ~     ",
		},
	},
	"turtle": {
		{
			"            ",
			"  _,--._   ",
			" ( {E}  {E} )  ",
			" /[_______]\\ ",
			" ``    ``  ",
		},
		{
			"            ",
			"  _,--._   ",
			" ( {E}  {E} )  ",
			" /[_______]\\ ",
			" ``    ``  ",
		},
		{
			"            ",
			"  _,--._   ",
			" ( {E}  {E} )  ",
			" /[=======]\\ ",
			" ``    ``  ",
		},
	},
	"snail": {
		{
			"            ",
			" {E}   .--.  ",
			"  \\ ( @ )  ",
			"   \\_`--'  ",
			"  ~~~~~~~   ",
		},
		{
			"            ",
			" {E}   .--.  ",
			"  | ( @ )  ",
			"   \\_`--'  ",
			"  ~~~~~~~   ",
		},
		{
			"            ",
			" {E}   .--.  ",
			"  \\ ( @ )  ",
			"   \\_`--'  ",
			"   ~~~~~~   ",
		},
	},
	"ghost": {
		{
			"            ",
			"  .------.  ",
			" / {E}  {E} \\  ",
			" |      |  ",
			" ~`~``~`~  ",
		},
		{
			"            ",
			"  .------.  ",
			" / {E}  {E} \\  ",
			" |      |  ",
			" `~`~~`~`  ",
		},
		{
			"  ~    ~    ",
			"  .------.  ",
			" / {E}  {E} \\  ",
			" |      |  ",
			" ~~`~~`~~  ",
		},
	},
	"axolotl": {
		{
			"            ",
			"}~(______)~{",
			"}~({E} .. {E})~{",
			" ( .--. )  ",
			" (_/  \\_)  ",
		},
		{
			"            ",
			"~}(______){~",
			"~}({E} .. {E}){~",
			" ( .--. )  ",
			" (_/  \\_)  ",
		},
		{
			"            ",
			"}~(______)~{",
			"}~({E} .. {E})~{",
			" (  --  )  ",
			" ~_/  \\_~  ",
		},
	},
	"capybara": {
		{
			"            ",
			" n______n  ",
			"( {E}   {E} )  ",
			"(  oo   ) ",
			" `------'  ",
		},
		{
			"            ",
			" n______n  ",
			"( {E}   {E} )  ",
			"(  Oo   ) ",
			" `------'  ",
		},
		{
			"  ~    ~    ",
			" u______n  ",
			"( {E}   {E} )  ",
			"(  oo   ) ",
			" `------'  ",
		},
	},
	"cactus": {
		{
			"            ",
			"n  ____  n ",
			"| |{E}  {E}| | ",
			"|_|    |_| ",
			"  |    |   ",
		},
		{
			"            ",
			"   ____    ",
			"n |{E}  {E}| n ",
			"|_|    |_| ",
			"  |    |   ",
		},
		{
			" n      n   ",
			" |  ____ |  ",
			" | |{E}  {E}| |  ",
			" |_|    |_| ",
			"   |    |   ",
		},
	},
	"robot": {
		{
			"            ",
			"  .[||].   ",
			" [ {E}  {E} ]  ",
			" [ ==== ]  ",
			" `------'  ",
		},
		{
			"            ",
			"  .[||].   ",
			" [ {E}  {E} ]  ",
			" [ -==- ]  ",
			" `------'  ",
		},
		{
			"     *      ",
			"  .[||].   ",
			" [ {E}  {E} ]  ",
			" [ ==== ]  ",
			" `------'  ",
		},
	},
	"rabbit": {
		{
			"            ",
			"  (\\___/)  ",
			" ( {E}  {E} )  ",
			"=(  ..  )= ",
			" (\")__(\")  ",
		},
		{
			"            ",
			"  (|___/)  ",
			" ( {E}  {E} )  ",
			"=(  ..  )= ",
			" (\")__(\")  ",
		},
		{
			"            ",
			"  (\\___/)  ",
			" ( {E}  {E} )  ",
			"=( .  . )= ",
			" (\")__(\")  ",
		},
	},
	"mushroom": {
		{
			"            ",
			" .-o-OO-o-. ",
			"(__________)",
			"   |{E}  {E}|   ",
			"   |____|   ",
		},
		{
			"            ",
			" .-O-oo-O-. ",
			"(__________)",
			"   |{E}  {E}|   ",
			"   |____|   ",
		},
		{
			"  .  o  .   ",
			" .-o-OO-o-. ",
			"(__________)",
			"   |{E}  {E}|   ",
			"   |____|   ",
		},
	},
	"chonk": {
		{
			"            ",
			" /\\    /\\  ",
			"( {E}   {E} )  ",
			"(  ..   ) ",
			" `------'  ",
		},
		{
			"            ",
			" /\\    |\\  ",
			"( {E}   {E} )  ",
			"(  ..   ) ",
			" `------'  ",
		},
		{
			"            ",
			" /\\    /\\  ",
			"( {E}   {E} )  ",
			"(  ..   ) ",
			" `------'~ ",
		},
	},
}

var hatLines = map[string]string{
	"none":      "",
	"crown":     "  \\^^^/   ",
	"tophat":    "  [____]  ",
	"propeller": "   -+-    ",
	"halo":      "  (    )  ",
	"wizard":    "   /^\\    ",
	"beanie":    "  (____)  ",
	"tinyduck":  "   ,>     ",
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
		if hatLine, ok := hatLines[bones.Hat]; ok && hatLine != "" {
			trimmed := strings.TrimSpace(lines[0])
			if trimmed == "" {
				lines[0] = hatLine
			}
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
		return "=" + eye + "\u03c9" + eye + "="
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
