const FORUM_SUBCATEGORIES = [
  { id: 'general', label: 'General Discussion', emoji: '💬' },
  { id: 'hotels', label: 'Hotels & Stays', emoji: '🏨' },
  { id: 'car_rentals', label: 'Car Rentals', emoji: '🚗' },
  { id: 'tours', label: 'Tours & Activities', emoji: '🗺️' },
  { id: 'food', label: 'Food & Dining', emoji: '🍽️' },
  { id: 'tips', label: 'Travel Tips', emoji: '💡' }
];

const COUNTRIES = [
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', cities: ['Tbilisi', 'Batumi', 'Kutaisi', 'Kazbegi', 'Svaneti', 'Kakheti', 'Mestia', 'Borjomi'] },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲', cities: ['Yerevan', 'Gyumri', 'Dilijan', 'Lake Sevan', 'Goris'] },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', cities: ['Baku', 'Ganja', 'Sheki', 'Gabala', 'Quba'] },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', cities: ['Istanbul', 'Antalya', 'Cappadocia', 'Izmir', 'Bodrum', 'Ankara'] },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', cities: ['Moscow', 'St Petersburg', 'Sochi', 'Kazan', 'Vladivostok'] },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah'] },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', cities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam'] },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', cities: ['Doha', 'Al Wakrah', 'Lusail'] },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', cities: ['Kuwait City', 'Hawalli', 'Salmiya'] },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', cities: ['Manama', 'Muharraq', 'Riffa'] },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', cities: ['Muscat', 'Salalah', 'Nizwa'] },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', cities: ['Amman', 'Petra', 'Aqaba', 'Dead Sea'] },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', cities: ['Tel Aviv', 'Jerusalem', 'Haifa', 'Eilat'] },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', cities: ['Beirut', 'Byblos', 'Tripoli', 'Baalbek'] },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', cities: ['Tehran', 'Isfahan', 'Shiraz', 'Mashhad'] },
  { code: 'FR', name: 'France', flag: '🇫🇷', cities: ['Paris', 'Nice', 'Lyon', 'Marseille', 'Bordeaux', 'Strasbourg'] },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', cities: ['Rome', 'Milan', 'Venice', 'Florence', 'Naples', 'Amalfi Coast'] },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', cities: ['Barcelona', 'Madrid', 'Seville', 'Valencia', 'Ibiza', 'Granada'] },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'] },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', cities: ['London', 'Edinburgh', 'Manchester', 'Liverpool', 'Bath'] },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'] },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', cities: ['Brussels', 'Bruges', 'Antwerp', 'Ghent'] },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', cities: ['Zurich', 'Geneva', 'Lucerne', 'Interlaken', 'Bern'] },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', cities: ['Vienna', 'Salzburg', 'Innsbruck', 'Graz'] },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', cities: ['Lisbon', 'Porto', 'Faro', 'Madeira'] },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', cities: ['Athens', 'Santorini', 'Mykonos', 'Thessaloniki', 'Crete'] },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', cities: ['Dubrovnik', 'Split', 'Zagreb', 'Hvar', 'Pula'] },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', cities: ['Warsaw', 'Krakow', 'Gdansk', 'Wroclaw'] },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', cities: ['Prague', 'Brno', 'Cesky Krumlov', 'Karlovy Vary'] },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', cities: ['Budapest', 'Debrecen', 'Szeged'] },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', cities: ['Bucharest', 'Brasov', 'Cluj-Napoca', 'Sibiu'] },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', cities: ['Sofia', 'Varna', 'Plovdiv', 'Bansko'] },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', cities: ['Belgrade', 'Novi Sad', 'Nis'] },
  { code: 'BA', name: 'Bosnia', flag: '🇧🇦', cities: ['Sarajevo', 'Mostar', 'Banja Luka'] },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', cities: ['Podgorica', 'Kotor', 'Budva', 'Tivat'] },
  { code: 'AL', name: 'Albania', flag: '🇦🇱', cities: ['Tirana', 'Durres', 'Saranda', 'Berat'] },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰', cities: ['Skopje', 'Ohrid', 'Bitola'] },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩', cities: ['Chisinau', 'Orhei', 'Tiraspol'] },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', cities: ['Kyiv', 'Lviv', 'Odesa', 'Kharkiv'] },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', cities: ['Minsk', 'Brest', 'Grodno'] },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', cities: ['Vilnius', 'Kaunas', 'Klaipeda'] },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', cities: ['Riga', 'Jurmala', 'Liepaja'] },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', cities: ['Tallinn', 'Tartu', 'Parnu'] },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', cities: ['Dublin', 'Galway', 'Cork', 'Killarney'] },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', cities: ['Reykjavik', 'Akureyri', 'Vik'] },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', cities: ['Oslo', 'Bergen', 'Tromso', 'Stavanger'] },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', cities: ['Stockholm', 'Gothenburg', 'Malmo', 'Uppsala'] },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', cities: ['Copenhagen', 'Aarhus', 'Odense'] },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', cities: ['Helsinki', 'Rovaniemi', 'Tampere', 'Turku'] },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', cities: ['Nicosia', 'Limassol', 'Paphos', 'Larnaca'] },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', cities: ['Valletta', 'Sliema', 'Gozo'] },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', cities: ['Marrakech', 'Casablanca', 'Fes', 'Chefchaouen'] },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', cities: ['Cairo', 'Luxor', 'Sharm El Sheikh', 'Alexandria', 'Hurghada'] },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', cities: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria'] },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', cities: ['Nairobi', 'Mombasa', 'Maasai Mara'] },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', cities: ['Lagos', 'Abuja', 'Port Harcourt'] },
  { code: 'US', name: 'United States', flag: '🇺🇸', cities: ['New York', 'Los Angeles', 'Miami', 'Las Vegas', 'San Francisco', 'Chicago', 'Hawaii'] },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Quebec City'] },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', cities: ['Cancun', 'Mexico City', 'Playa del Carmen', 'Tulum', 'Guadalajara'] },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', cities: ['Rio de Janeiro', 'Sao Paulo', 'Salvador', 'Brasilia'] },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', cities: ['Buenos Aires', 'Bariloche', 'Mendoza', 'Ushuaia'] },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', cities: ['Santiago', 'Valparaiso', 'Patagonia', 'Easter Island'] },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', cities: ['Bogota', 'Medellin', 'Cartagena', 'Cali'] },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', cities: ['Lima', 'Cusco', 'Machu Picchu', 'Arequipa'] },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', cities: ['Tokyo', 'Kyoto', 'Osaka', 'Hiroshima', 'Sapporo', 'Okinawa'] },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', cities: ['Seoul', 'Busan', 'Jeju', 'Incheon'] },
  { code: 'CN', name: 'China', flag: '🇨🇳', cities: ['Beijing', 'Shanghai', 'Hong Kong', 'Guangzhou', 'Chengdu', 'Xi\'an'] },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', cities: ['Taipei', 'Kaohsiung', 'Taichung'] },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', cities: ['Bangkok', 'Phuket', 'Chiang Mai', 'Krabi', 'Pattaya'] },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', cities: ['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hoi An', 'Halong Bay'] },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', cities: ['Bali', 'Jakarta', 'Yogyakarta', 'Lombok', 'Komodo'] },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', cities: ['Kuala Lumpur', 'Penang', 'Langkawi', 'Malacca'] },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', cities: ['Singapore'] },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', cities: ['Manila', 'Cebu', 'Boracay', 'Palawan'] },
  { code: 'IN', name: 'India', flag: '🇮🇳', cities: ['Delhi', 'Mumbai', 'Goa', 'Jaipur', 'Kerala', 'Agra'] },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', cities: ['Colombo', 'Kandy', 'Galle', 'Sigiriya'] },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', cities: ['Kathmandu', 'Pokhara', 'Chitwan'] },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', cities: ['Almaty', 'Astana', 'Shymkent'] },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', cities: ['Tashkent', 'Samarkand', 'Bukhara', 'Khiva'] },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Gold Coast'] },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', cities: ['Auckland', 'Queenstown', 'Wellington', 'Christchurch'] }
];

function getCountry(codeOrName) {
  return COUNTRIES.find(c => c.code === codeOrName || c.name === codeOrName);
}

function chatChannelId(country, city) {
  return city ? `${country}|${city}` : country;
}

function parseChatChannel(channel) {
  const [country, city] = (channel || 'GE').split('|');
  return { country, city: city || null };
}

module.exports = { COUNTRIES, FORUM_SUBCATEGORIES, getCountry, chatChannelId, parseChatChannel };