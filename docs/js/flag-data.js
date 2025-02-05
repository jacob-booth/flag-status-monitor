// Historical flag facts and events
const FLAG_FACTS = [
    {
        id: 1,
        fact: "The current 50-star design was created by 17-year-old Robert G. Heft in 1958 as a school project.",
        category: "design",
        year: 1958
    },
    {
        id: 2,
        fact: "The first American flag was sewn by Betsy Ross in 1776.",
        category: "history",
        year: 1776
    },
    {
        id: 3,
        fact: "The flag's colors have specific meanings: red for valor, white for purity, and blue for justice.",
        category: "symbolism"
    },
    {
        id: 4,
        fact: "The flag must be illuminated if displayed at night.",
        category: "etiquette"
    },
    {
        id: 5,
        fact: "Six American flags have been planted on the moon.",
        category: "space",
        year: 1969
    }
];

// Historical events by date
const FLAG_EVENTS = {
    "01-01": [
        {
            year: 1776,
            event: "The first unofficial American flag, the Grand Union Flag, was raised"
        }
    ],
    "06-14": [
        {
            year: 1777,
            event: "The Continental Congress adopted the Stars and Stripes as the national flag"
        }
    ],
    "07-04": [
        {
            year: 1960,
            event: "The 50-star flag was officially adopted"
        }
    ],
    "08-21": [
        {
            year: 1959,
            event: "President Eisenhower issued an Executive Order for the arrangement of stars on the flag"
        }
    ]
};

// Monthly themes
const MONTHLY_THEMES = {
    "01": "New Year's Flag Traditions",
    "02": "Presidents and the Flag",
    "03": "Women in Flag History",
    "04": "Military Flag Traditions",
    "05": "Memorial Day Flag Protocol",
    "06": "Flag Day Celebrations",
    "07": "Independence and the Flag",
    "08": "State Flags and History",
    "09": "Patriot Day Remembrance",
    "10": "Flag Conservation",
    "11": "Veterans and the Flag",
    "12": "Flag in American Culture"
};

// Flag fun facts for hover states
const HOVER_FACTS = [
    "The flag is called 'Old Glory', 'The Stars and Stripes', and 'The Star-Spangled Banner'",
    "Flag Day is celebrated on June 14th",
    "There have been 27 official versions of the American flag",
    "The current flag design has been used longer than any other U.S. flag design",
    "The flag on the moon is now white due to solar radiation"
];

// Export all data
export {
    FLAG_FACTS,
    FLAG_EVENTS,
    MONTHLY_THEMES,
    HOVER_FACTS
};

// Utility functions for working with flag data
export const getFlagFactsByCategory = (category) => 
    FLAG_FACTS.filter(fact => fact.category === category);

export const getEventsByMonth = (month) => 
    Object.entries(FLAG_EVENTS)
        .filter(([date]) => date.startsWith(month))
        .map(([date, events]) => ({ date, events }));

export const getRandomFact = () => 
    HOVER_FACTS[Math.floor(Math.random() * HOVER_FACTS.length)];

export const getThemeForMonth = (month) => 
    MONTHLY_THEMES[month.padStart(2, '0')] || "American Flag History";

// Date formatting utility
export const formatEventDate = (dateString) => {
    const [month, day] = dateString.split('-');
    return new Date(2025, parseInt(month) - 1, parseInt(day))
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};