export const FactionNames = {
	CyberSec: "CyberSec",
	NiteSec: "NiteSec",
	TheBlackHand: "The Black Hand",
	BitRunners: "BitRunners",
	Daedalus: "Daedalus",
	TianDiHui: "Tian Di Hui",
	Netburners: "Netburners",
	SlumSnakes: "Slum Snakes",
	Tetrads: "Tetrads",
	Sector12: "Sector-12",
	Aevum: "Aevum",
	Volhaven: "Volhaven",
	Chongqing: "Chongqing",
	Ishima: "Ishima",
	NewTokyo: "New Tokyo",
	Illuminati: "Illuminati",
	TheCovenant: "The Covenant",
	ECorp: "ECorp",
	MegaCorp: "MegaCorp",
	BachmanAssociates: "Bachman & Associates",
	BladeIndustries: "Blade Industries",
	NWO: "NWO",
	ClarkeIncorporated: "Clarke Incorporated",
	OmniTekIncorporated: "OmniTek Incorporated",
	FourSigma: "Four Sigma",
	KuaiGongInternational: "KuaiGong International",
	FulcrumSecretTechnologies: "Fulcrum Secret Technologies",
	SpeakersForTheDead: "Speakers for the Dead",
	TheDarkArmy: "The Dark Army",
	TheSyndicate: "The Syndicate",
	Silhouette: "Silhouette",
	Bladeburners: "Bladeburners",
	ChurchOfTheMachineGod: "Church of the Machine God",
	ShadowsOfAnarchy: "Shadows of Anarchy"
};

export const MilestoneFactions = [
	"CyberSec",
	"NiteSec",
	"The Black Hand",
	"BitRunners",
	"Daedalus",
	"Tian Di Hui"
];

export function getAllFactions() {
	return Array.from(Object.values(FactionNames));
}