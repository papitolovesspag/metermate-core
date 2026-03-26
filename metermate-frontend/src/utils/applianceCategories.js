// src/utils/applianceCategories.js

// Comprehensive appliance database with typical wattages
export const APPLIANCE_CATEGORIES = {
  lighting: {
    name: 'Lighting',
    appliances: {
      'LED_BULB': { name: 'LED Bulb (9W)', wattage: 9 },
      'INCANDESCENT_BULB': { name: 'Incandescent Bulb (60W)', wattage: 60 },
      'FLUORESCENT': { name: 'Fluorescent Light (40W)', wattage: 40 },
      'BULB_PACK_LED': { name: 'LED Pack (Multiple)', wattage: 25 },
    }
  },
  cooling: {
    name: 'Cooling & Heating',
    appliances: {
      'AC_WINDOW': { name: 'Window AC (1200W)', wattage: 1200 },
      'AC_SPLIT': { name: 'Split AC (1500W)', wattage: 1500 },
      'AC_PORTABLE': { name: 'Portable AC (900W)', wattage: 900 },
      'FAN_CEILING': { name: 'Ceiling Fan (75W)', wattage: 75 },
      'FAN_TABLE': { name: 'Table Fan (50W)', wattage: 50 },
      'HEATER': { name: 'Electric Heater (1500W)', wattage: 1500 },
    }
  },
  kitchen: {
    name: 'Kitchen Appliances',
    appliances: {
      'REFRIGERATOR': { name: 'Refrigerator (150W avg)', wattage: 150 },
      'MICROWAVE': { name: 'Microwave (1000W)', wattage: 1000 },
      'OVEN_ELECTRIC': { name: 'Electric Oven (2000W)', wattage: 2000 },
      'KETTLE': { name: 'Electric Kettle (1500W)', wattage: 1500 },
      'BLENDER': { name: 'Blender (500W)', wattage: 500 },
      'TOASTER': { name: 'Toaster (800W)', wattage: 800 },
      'RICE_COOKER': { name: 'Rice Cooker (500W)', wattage: 500 },
    }
  },
  entertainment: {
    name: 'Entertainment',
    appliances: {
      'TV_LED': { name: 'LED TV (65W)', wattage: 65 },
      'TV_LCD': { name: 'LCD TV (100W)', wattage: 100 },
      'TV_PLASMA': { name: 'Plasma TV (150W)', wattage: 150 },
      'SOUND_SYSTEM': { name: 'Sound System (100W)', wattage: 100 },
    }
  },
  personal: {
    name: 'Personal Care',
    appliances: {
      'IRON': { name: 'Electric Iron (1000W)', wattage: 1000 },
      'HAIR_DRYER': { name: 'Hair Dryer (1500W)', wattage: 1500 },
      'WASHING_MACHINE': { name: 'Washing Machine (500W)', wattage: 500 },
      'WATER_HEATER': { name: 'Water Heater (2000W)', wattage: 2000 },
    }
  },
  computing: {
    name: 'Computing & Office',
    appliances: {
      'DESKTOP_PC': { name: 'Desktop PC (300W)', wattage: 300 },
      'LAPTOP': { name: 'Laptop (60W)', wattage: 60 },
      'PRINTER': { name: 'Printer (300W)', wattage: 300 },
      'MONITOR': { name: 'Monitor (50W)', wattage: 50 },
    }
  },
  other: {
    name: 'Other',
    appliances: {
      'CUSTOM': { name: 'Custom Device', wattage: 0 },
    }
  }
};

// Flatten all appliances for selection
export const getAllAppliances = () => {
  const flattened = [];
  Object.values(APPLIANCE_CATEGORIES).forEach(category => {
    Object.entries(category.appliances).forEach(([key, value]) => {
      flattened.push({
        id: key,
        ...value,
        category: category.name
      });
    });
  });
  return flattened;
};

// Get appliance by ID
export const getApplianceByKey = (key) => {
  for (const category of Object.values(APPLIANCE_CATEGORIES)) {
    if (category.appliances[key]) {
      return category.appliances[key];
    }
  }
  return null;
};

// Calculate consumption and distribution
export const calculateConsumptionShare = (appliances, members) => {
  if (!appliances || appliances.length === 0) {
    // Equal split if no appliances
    const sharePerMember = 100 / (members.length || 1);
    return members.reduce((acc, member) => {
      acc[member.id] = {
        percentage: sharePerMember,
        usage_hours: 0,
        daily_kwh: 0
      };
      return acc;
    }, {});
  }

  // Calculate consumption per member
  const memberConsumption = {};
  let totalKwh = 0;

  appliances.forEach(app => {
    const memberId = app.user_id;
    const wattage = app.wattage || 0;
    const hours = parseFloat(app.daily_hours) || 0;
    const dailyKwh = (wattage * hours) / 1000;

    if (!memberConsumption[memberId]) {
      memberConsumption[memberId] = { daily_kwh: 0, device_count: 0, usage_hours: 0 };
    }

    memberConsumption[memberId].daily_kwh += dailyKwh;
    memberConsumption[memberId].device_count += 1;
    memberConsumption[memberId].usage_hours += hours;
    totalKwh += dailyKwh;
  });

  // Calculate percentages
  const result = {};
  members.forEach(member => {
    const consumption = memberConsumption[member.id];
    if (consumption) {
      result[member.id] = {
        percentage: totalKwh > 0 ? (consumption.daily_kwh / totalKwh) * 100 : 0,
        daily_kwh: consumption.daily_kwh,
        device_count: consumption.device_count,
        usage_hours: consumption.usage_hours
      };
    } else {
      result[member.id] = {
        percentage: 0,
        daily_kwh: 0,
        device_count: 0,
        usage_hours: 0
      };
    }
  });

  return result;
};
