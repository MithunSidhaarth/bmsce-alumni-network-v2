// Alumni chapters that have an active WhatsApp group (verified by the client).
// This is the complete list — anything not here does not have a group yet.
//
// The India chapters (Bengaluru — the home/campus city — plus Mumbai, Delhi,
// Hyderabad, and Pune) are kept in addition to the verified list, confirmed
// with the client. Individual chapters have NO per-city join links:
// the single clickable action on the Chapters page is the global WhatsApp
// community link below. Do not add per-chapter links without real join URLs.
export const GLOBAL_WHATSAPP_URL =
  "https://chat.whatsapp.com/HO8HaY2wkgqH9nELKgJVY5";

// Continents in display order for the grouped Chapters page.
export const CONTINENTS = [
  "North America",
  "Europe",
  "Asia",
  "Oceania",
] as const;

export type Continent = (typeof CONTINENTS)[number];

export type Chapter = {
  name: string;
  continent: Continent;
  // Home country. null for regional chapters (Europe, SEA, GCC, Oceania), which
  // are excluded from the unique-country count on the homepage stats.
  country: string | null;
  // Representative city/region photo (freely-licensed Wikimedia Commons image,
  // hotlinked). The card falls back to a brand-colored tile if the image fails.
  image: string;
  // [longitude, latitude] for the chapter map. Regional chapters (Europe, SEA,
  // GCC, Oceania) use a representative city — the same one the photo depicts.
  coordinates: [number, number];
};

export const chapters: Chapter[] = [
  { name: "Bengaluru", continent: "Asia", country: "India", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/View_from_Visvesvaraya_Industrial_and_Technological_Museum_%282025%29_02.jpg/960px-View_from_Visvesvaraya_Industrial_and_Technological_Museum_%282025%29_02.jpg", coordinates: [77.59, 12.97] },
  { name: "Mumbai", continent: "Asia", country: "India", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Mumbai_Bandra-Worli_Sea_Link.jpg/960px-Mumbai_Bandra-Worli_Sea_Link.jpg", coordinates: [72.88, 19.08] },
  { name: "Delhi", continent: "Asia", country: "India", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Forecourt%2C_Rashtrapati_Bhavan_-_1.jpg/960px-Forecourt%2C_Rashtrapati_Bhavan_-_1.jpg", coordinates: [77.21, 28.61] },
  { name: "Hyderabad", continent: "Asia", country: "India", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Downtown_hyderabad_drone.png/960px-Downtown_hyderabad_drone.png", coordinates: [78.49, 17.39] },
  { name: "Pune", continent: "Asia", country: "India", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pune_West_skyline_-_March_2017.jpg/960px-Pune_West_skyline_-_March_2017.jpg", coordinates: [73.86, 18.52] },
  { name: "Amsterdam", continent: "Europe", country: "Netherlands", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Imagen_de_los_canales_conc%C3%A9ntricos_en_%C3%81msterdam.png/960px-Imagen_de_los_canales_conc%C3%A9ntricos_en_%C3%81msterdam.png", coordinates: [4.9, 52.37] },
  { name: "Boston", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/ISH_WC_Boston4.jpg/960px-ISH_WC_Boston4.jpg", coordinates: [-71.06, 42.36] },
  { name: "Japan", continent: "Asia", country: "Japan", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Skyscrapers_of_Shinjuku_2009_January.jpg/960px-Skyscrapers_of_Shinjuku_2009_January.jpg", coordinates: [139.69, 35.68] },
  { name: "Nepal", continent: "Asia", country: "Nepal", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Kathmandu-Durbar_Square-06-Mahavishnu-Kuh-Vishnu-Pratapamalla-Jagannath-2007-gje.jpg/960px-Kathmandu-Durbar_Square-06-Mahavishnu-Kuh-Vishnu-Pratapamalla-Jagannath-2007-gje.jpg", coordinates: [85.32, 27.72] },
  { name: "Vancouver", continent: "North America", country: "Canada", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Skyline_of_Vancouver%2C_Canada.jpg/960px-Skyline_of_Vancouver%2C_Canada.jpg", coordinates: [-123.12, 49.28] },
  { name: "Arizona", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Canyon_River_Tree_%28165872763%29.jpeg/960px-Canyon_River_Tree_%28165872763%29.jpeg", coordinates: [-112.07, 33.45] },
  { name: "DC Tri-State", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/12-07-13-washington-by-RalfR-08.jpg/960px-12-07-13-washington-by-RalfR-08.jpg", coordinates: [-77.04, 38.91] },
  { name: "Nashville", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Nashville%2C_TN_skyline.jpg/960px-Nashville%2C_TN_skyline.jpg", coordinates: [-86.78, 36.16] },
  { name: "Singapore", continent: "Asia", country: "Singapore", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Marina_Bay_Sands_%28I%29.jpg/960px-Marina_Bay_Sands_%28I%29.jpg", coordinates: [103.82, 1.35] },
  { name: "Munich", continent: "Europe", country: "Germany", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Stadtbild_M%C3%BCnchen.jpg/960px-Stadtbild_M%C3%BCnchen.jpg", coordinates: [11.58, 48.14] },
  { name: "Chicago", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Chicago_River_ferry_b.jpg/960px-Chicago_River_ferry_b.jpg", coordinates: [-87.63, 41.88] },
  { name: "Dubai", continent: "Asia", country: "United Arab Emirates", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Dubai_Marina_Skyline.jpg/960px-Dubai_Marina_Skyline.jpg", coordinates: [55.27, 25.2] },
  { name: "SEA (Southeast Asia)", continent: "Asia", country: null, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/4Y1A1159_Bangkok_%2833536795515%29.jpg/960px-4Y1A1159_Bangkok_%2833536795515%29.jpg", coordinates: [100.5, 13.75] },
  { name: "San Diego", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/La_Jolla_Shores_view_%28cropped%29.jpg/960px-La_Jolla_Shores_view_%28cropped%29.jpg", coordinates: [-117.16, 32.72] },
  { name: "Dublin", continent: "Europe", country: "Ireland", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Dublin_-_aerial_-_2025-07-07_01.jpg/960px-Dublin_-_aerial_-_2025-07-07_01.jpg", coordinates: [-6.27, 53.35] },
  { name: "GCC", continent: "Asia", country: null, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/The_Pearl_Marina_in_Nov_2013.jpg/960px-The_Pearl_Marina_in_Nov_2013.jpg", coordinates: [51.53, 25.29] },
  { name: "Portland, OR", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Portland_Oregon_Aerial%2C_June_2025.jpg/960px-Portland_Oregon_Aerial%2C_June_2025.jpg", coordinates: [-122.68, 45.52] },
  { name: "San Francisco", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/San_Francisco_Downtown_Aerial%2C_August_2025.jpg/960px-San_Francisco_Downtown_Aerial%2C_August_2025.jpg", coordinates: [-122.42, 37.77] },
  { name: "New York", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_%28cropped%29.jpg/960px-View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_%28cropped%29.jpg", coordinates: [-74.01, 40.71] },
  { name: "Texas", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Skyline_of_Austin%2C_Texas_%28cropped%29.jpg/960px-Skyline_of_Austin%2C_Texas_%28cropped%29.jpg", coordinates: [-97.74, 30.27] },
  { name: "Europe", continent: "Europe", country: null, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg/960px-La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg", coordinates: [2.35, 48.86] },
  { name: "Oceania", continent: "Oceania", country: null, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Sydney_Opera_House_and_Harbour_Bridge_Dusk_%282%29_2019-06-21.jpg/960px-Sydney_Opera_House_and_Harbour_Bridge_Dusk_%282%29_2019-06-21.jpg", coordinates: [151.21, -33.87] },
  { name: "Seattle", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Seattle_Center_as_night_falls.jpg/960px-Seattle_Center_as_night_falls.jpg", coordinates: [-122.33, 47.61] },
  { name: "London", continent: "Europe", country: "United Kingdom", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/London_Skyline_%28125508655%29.jpeg/960px-London_Skyline_%28125508655%29.jpeg", coordinates: [-0.12, 51.51] },
  { name: "Toronto", continent: "North America", country: "Canada", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Toronto_Skyline_from_Olympic_Island%2C_June_20_2026_%285-3_cropped%29.jpg/960px-Toronto_Skyline_from_Olympic_Island%2C_June_20_2026_%285-3_cropped%29.jpg", coordinates: [-79.38, 43.65] },
  { name: "California", continent: "North America", country: "United States", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Hollywood_sign_%288485145044%29.jpg/960px-Hollywood_sign_%288485145044%29.jpg", coordinates: [-118.24, 34.05] },
];

// Live counts for the homepage stats — derived, never hardcoded.
export const CHAPTER_COUNT = chapters.length;
export const COUNTRY_COUNT = new Set(
  chapters.map((c) => c.country).filter((c): c is string => c !== null)
).size;
