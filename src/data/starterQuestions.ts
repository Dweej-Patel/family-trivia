import type { Question } from '../types'

// A curated, family-friendly starter pack so the game is fun immediately.
// Players can edit/add/remove these in the Library screen.
export const starterQuestions: Question[] = [
  // ── General Knowledge ──
  { id: 'sq1', category: 'General', difficulty: 'easy', type: 'mc', prompt: 'How many colors are in a rainbow?', options: ['5', '6', '7', '8'], correctIndex: 2 },
  { id: 'sq2', category: 'General', difficulty: 'easy', type: 'mc', prompt: 'What is the tallest animal in the world?', options: ['Elephant', 'Giraffe', 'Horse', 'Camel'], correctIndex: 1 },
  { id: 'sq3', category: 'General', difficulty: 'medium', type: 'mc', prompt: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], correctIndex: 1 },
  { id: 'sq4', category: 'General', difficulty: 'easy', type: 'tf', prompt: 'A group of crows is called a murder.', options: ['True', 'False'], correctIndex: 0 },
  { id: 'sq5', category: 'General', difficulty: 'medium', type: 'mc', prompt: 'What do you call a baby kangaroo?', options: ['Cub', 'Joey', 'Kit', 'Calf'], correctIndex: 1 },

  // ── Science & Nature ──
  { id: 'sq6', category: 'Science', difficulty: 'easy', type: 'mc', prompt: 'What planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], correctIndex: 2 },
  { id: 'sq7', category: 'Science', difficulty: 'easy', type: 'mc', prompt: 'What gas do plants breathe in that humans breathe out?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'], correctIndex: 1 },
  { id: 'sq8', category: 'Science', difficulty: 'medium', type: 'mc', prompt: 'How many bones does an adult human have?', options: ['106', '206', '306', '406'], correctIndex: 1 },
  { id: 'sq9', category: 'Science', difficulty: 'hard', type: 'mc', prompt: 'What is the hardest natural substance on Earth?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], correctIndex: 2 },
  { id: 'sq10', category: 'Science', difficulty: 'medium', type: 'tf', prompt: 'Lightning is hotter than the surface of the Sun.', options: ['True', 'False'], correctIndex: 0 },
  { id: 'sq11', category: 'Science', difficulty: 'easy', type: 'mc', prompt: 'What is H₂O more commonly known as?', options: ['Salt', 'Water', 'Sugar', 'Air'], correctIndex: 1 },

  // ── Geography ──
  { id: 'sq12', category: 'Geography', difficulty: 'easy', type: 'mc', prompt: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctIndex: 3 },
  { id: 'sq13', category: 'Geography', difficulty: 'medium', type: 'mc', prompt: 'What is the capital of Japan?', options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'], correctIndex: 2 },
  { id: 'sq14', category: 'Geography', difficulty: 'medium', type: 'mc', prompt: 'Which country has the most natural lakes?', options: ['USA', 'Russia', 'Canada', 'Brazil'], correctIndex: 2 },
  { id: 'sq15', category: 'Geography', difficulty: 'hard', type: 'mc', prompt: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correctIndex: 1 },
  { id: 'sq16', category: 'Geography', difficulty: 'easy', type: 'tf', prompt: 'Australia is both a country and a continent.', options: ['True', 'False'], correctIndex: 0 },

  // ── Movies & TV ──
  { id: 'sq17', category: 'Movies', difficulty: 'easy', type: 'mc', prompt: 'In "Toy Story", what kind of toy is Woody?', options: ['Astronaut', 'Cowboy', 'Dinosaur', 'Robot'], correctIndex: 1 },
  { id: 'sq18', category: 'Movies', difficulty: 'easy', type: 'mc', prompt: 'What is the name of the lion king\'s son?', options: ['Simba', 'Mufasa', 'Scar', 'Nala'], correctIndex: 0 },
  { id: 'sq19', category: 'Movies', difficulty: 'medium', type: 'mc', prompt: 'In "Frozen", what is the name of the snowman?', options: ['Sven', 'Olaf', 'Kristoff', 'Hans'], correctIndex: 1 },
  { id: 'sq20', category: 'Movies', difficulty: 'medium', type: 'mc', prompt: 'Which movie features a clownfish named Nemo?', options: ['Shark Tale', 'Finding Nemo', 'Moana', 'Luca'], correctIndex: 1 },
  { id: 'sq21', category: 'Movies', difficulty: 'hard', type: 'mc', prompt: 'Who directed the movie "Jurassic Park"?', options: ['George Lucas', 'James Cameron', 'Steven Spielberg', 'Ridley Scott'], correctIndex: 2 },

  // ── Music ──
  { id: 'sq22', category: 'Music', difficulty: 'easy', type: 'mc', prompt: 'How many strings does a standard guitar have?', options: ['4', '5', '6', '7'], correctIndex: 2 },
  { id: 'sq23', category: 'Music', difficulty: 'medium', type: 'mc', prompt: 'Which instrument has black and white keys?', options: ['Violin', 'Piano', 'Flute', 'Drums'], correctIndex: 1 },
  { id: 'sq24', category: 'Music', difficulty: 'hard', type: 'mc', prompt: 'How many symphonies did Beethoven complete?', options: ['7', '9', '12', '15'], correctIndex: 1 },

  // ── Sports ──
  { id: 'sq25', category: 'Sports', difficulty: 'easy', type: 'mc', prompt: 'How many players are on a soccer team on the field?', options: ['9', '10', '11', '12'], correctIndex: 2 },
  { id: 'sq26', category: 'Sports', difficulty: 'medium', type: 'mc', prompt: 'In which sport would you perform a slam dunk?', options: ['Tennis', 'Basketball', 'Golf', 'Cricket'], correctIndex: 1 },
  { id: 'sq27', category: 'Sports', difficulty: 'medium', type: 'tf', prompt: 'A marathon is exactly 26.2 miles long.', options: ['True', 'False'], correctIndex: 0 },
  { id: 'sq28', category: 'Sports', difficulty: 'hard', type: 'mc', prompt: 'How often are the Summer Olympic Games held?', options: ['Every 2 years', 'Every 3 years', 'Every 4 years', 'Every 5 years'], correctIndex: 2 },

  // ── Food ──
  { id: 'sq29', category: 'Food', difficulty: 'easy', type: 'mc', prompt: 'What fruit is traditionally used to make wine?', options: ['Apple', 'Grape', 'Orange', 'Cherry'], correctIndex: 1 },
  { id: 'sq30', category: 'Food', difficulty: 'easy', type: 'mc', prompt: 'Which of these is a breakfast food?', options: ['Pancakes', 'Tacos', 'Sushi', 'Pizza'], correctIndex: 0 },
  { id: 'sq31', category: 'Food', difficulty: 'medium', type: 'mc', prompt: 'What spice is the world\'s most expensive by weight?', options: ['Cinnamon', 'Saffron', 'Vanilla', 'Pepper'], correctIndex: 1 },
  { id: 'sq32', category: 'Food', difficulty: 'medium', type: 'tf', prompt: 'A tomato is botanically a fruit.', options: ['True', 'False'], correctIndex: 0 },

  // ── History ──
  { id: 'sq33', category: 'History', difficulty: 'medium', type: 'mc', prompt: 'Who was the first President of the United States?', options: ['Abraham Lincoln', 'Thomas Jefferson', 'George Washington', 'John Adams'], correctIndex: 2 },
  { id: 'sq34', category: 'History', difficulty: 'easy', type: 'mc', prompt: 'The Great Pyramids are located in which country?', options: ['Mexico', 'Egypt', 'Greece', 'Italy'], correctIndex: 1 },
  { id: 'sq35', category: 'History', difficulty: 'hard', type: 'mc', prompt: 'In what year did World War II end?', options: ['1918', '1939', '1945', '1950'], correctIndex: 2 },
  { id: 'sq36', category: 'History', difficulty: 'hard', type: 'mc', prompt: 'Which ship famously sank in 1912?', options: ['Lusitania', 'Titanic', 'Mayflower', 'Endeavour'], correctIndex: 1 },

  // ── Animals ──
  { id: 'sq37', category: 'Animals', difficulty: 'easy', type: 'mc', prompt: 'Which animal is known as man\'s best friend?', options: ['Cat', 'Dog', 'Horse', 'Rabbit'], correctIndex: 1 },
  { id: 'sq38', category: 'Animals', difficulty: 'medium', type: 'mc', prompt: 'What is the fastest land animal?', options: ['Lion', 'Cheetah', 'Horse', 'Greyhound'], correctIndex: 1 },
  { id: 'sq39', category: 'Animals', difficulty: 'medium', type: 'tf', prompt: 'Octopuses have three hearts.', options: ['True', 'False'], correctIndex: 0 },
  { id: 'sq40', category: 'Animals', difficulty: 'hard', type: 'mc', prompt: 'A group of lions is called a what?', options: ['Pack', 'Pride', 'Herd', 'Flock'], correctIndex: 1 },
]
