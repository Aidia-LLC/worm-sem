const getDataArray = (shape) => {
  const { x, y, width, height } = shape;
  const data = new Uint8Array(100 * 100 * 4);

  // Set all pixels to black (0, 0, 0, 255)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0; // Red
    data[i + 1] = 0; // Green
    data[i + 2] = 0; // Blue
    data[i + 3] = 255; // Alpha
  }

  // Set pixels within the defined square to white (255, 255, 255, 255)
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      const index = (row * 100 + col) * 4;
      data[index] = 255; // Red
      data[index + 1] = 255; // Green
      data[index + 2] = 255; // Blue
      data[index + 3] = 255; // Alpha
    }
  }

  return data;
};

const pickRandomItemFromArray = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

const GeneticAlgorithm = () => {
  const getIdealImage = () => {
    return getDataArray({
      x: 50,
      y: 50,
      width: 50,
      height: 50,
    });
    //the ideal image is a black square on a white background
  };

  const fitnessFunction = (shape) => {
    const goodShape = getIdealImage();
    const image = getDataArray(shape);
    const distance = goodShape.reduce((sum, pixel, i) => {
      return sum + Math.abs(pixel - image[i]);
    }, 0);
    return Math.pow(0.98, distance);
  };
  const mutate = (shape) => {
    // mutate the shape
    return {
      x: shape.x + Math.round(Math.random() * 10 - 5),
      y: shape.y + Math.round(Math.random() * 10 - 5),
      width: shape.width + Math.round(Math.random() * 10 - 5),
      height: shape.height + Math.round(Math.random() * 10 - 5),
    };
  };
  const crossover = (shape1, shape2) => {
    // crossover the shapes
    return {
      x: Math.random() < 0.5 ? shape1.x : shape2.x,
      y: Math.random() < 0.5 ? shape1.y : shape2.y,
      width: Math.random() < 0.5 ? shape1.width : shape2.width,
      height: Math.random() < 0.5 ? shape1.height : shape2.height,
    };
  };
  const generateShape = () => {
    // generate a random shape
    return {
      x: Math.round(Math.random() * 100),
      y: Math.round(Math.random() * 100),
      width: Math.round(Math.random() * 100),
      height: Math.round(Math.random() * 100),
    };
  };
  const createGeneration = () => {
    // create a generation of shapes
    return Array.from(Array(100), generateShape);
  };
  const loop = () => {
    let population = createGeneration();
    let i = 0;
    while (i < 9999) {
      i++;
      population.sort((a, b) => {
        return fitnessFunction(b) - fitnessFunction(a);
      });
      if (fitnessFunction(population[0]) === 1) {
        console.log(i, "found valid shape", population[0]);
        return population[0];
      }
      const survivors = population.slice(0, 40);
      const mutants = Array.from(Array(10), generateShape);
      population = survivors.concat(mutants).map(mutate);
      for (let i = 0; i < 50; i++) {
        population.push(
          crossover(population[i], pickRandomItemFromArray(population))
        );
      }
      if (i % 100 === 0) {
        console.log(
          i,
          "best shape so far",
          population[0],
          fitnessFunction(population[0])
        );
      }
    }
    console.log(
      "failed to find valid shape",
      population[0],
      fitnessFunction(population[0])
    );
    return population[0];
  };
  return loop();
};

GeneticAlgorithm();

// const getValidSeason = ({
//   league,
//   validDaySchedules,
// }: {
//   league: League;
//   validDaySchedules: GameFieldTime[][];
// }) => {
//   //balance home vs away
//   const assignHomeAway = (schedule: GameFieldTime[]): SeasonGame[] => {
//     return schedule.map((gameTime) => {
//       const homeAway =
//         Math.random() < 0.5
//           ? [gameTime.match[0], gameTime.match[1]]
//           : [gameTime.match[1], gameTime.match[0]];
//       return {
//         home: homeAway[0],
//         away: homeAway[1],
//         field: gameTime.field,
//         playingTime: gameTime.playingTime,
//       };
//     });
//   };
//   const evenHomeAwayMultiplier = (schedule: SeasonGame[]) => {
//     const homeAway = schedule.reduce((map, game) => {
//       if (game.home.name === "Bye" || game.away.name === "Bye") return map;
//       map.set(game.home.name, (map.get(game.home.name) || 0) + 1);
//       map.set(game.away.name, (map.get(game.away.name) || 0) - 1);
//       return map;
//     }, new Map());
//     const teamsNotEven = [...homeAway.values()]
//       .map((v) => Math.abs(v))
//       .reduce((sum, next) => sum + (next > 1 ? next : 0), 0);
//     return Math.pow(0.9, teamsNotEven);
//   };
//   const testBadMatch = (game: SeasonGame, season: SeasonGame[]) => {
//     if (game.home.name === "Bye" || game.away.name === "Bye") return false;
//     const homeAway = season.reduce((map, game) => {
//       if (game.home.name === "Bye" || game.away.name === "Bye") return map;
//       map.set(game.home.name, (map.get(game.home.name) || 0) + 1);
//       map.set(game.away.name, (map.get(game.away.name) || 0) - 1);
//       return map;
//     }, new Map());
//     const homeCount = homeAway.get(game.home.name) || 0;
//     const awayCount = homeAway.get(game.away.name) || 0;

//     if (homeCount - awayCount > 1) return true;
//   };
//   const fitnessFunction = (season: SeasonGame[]) => {
//     let fitness = 1;
//     fitness *= evenHomeAwayMultiplier(season);
//     return fitness;
//   };
//   const generateSchedule = () => {
//     const schedule = assignHomeAway(pickRandomItemFromArray(validDaySchedules));
//     return {
//       schedule,
//       fitness: fitnessFunction(schedule),
//     };
//   };
//   const mutate = (p: { schedule: SeasonGame[] }) => {
//     const schedule = p.schedule;
//     for (const game of schedule) {
//       //if bad match, high chance of mutation
//       if (testBadMatch(game, schedule) && Math.random() < 0.8) {
//         const home = game.home;
//         game.home = game.away;
//         game.away = home;
//       }
//       // 20% chance of mutation - swap home and away
//       // if (Math.random() < 0.2) {
//       //   const home = game.home;
//       //   game.home = game.away;
//       //   game.away = home;
//       // }
//     }
//     return {
//       schedule,
//       fitness: fitnessFunction(schedule),
//     };
//   };
//   function loop(): SeasonGame[][] {
//     let population = Array.from(Array(100), generateSchedule);
//     let i = 0;
//     while (i < 9999) {
//       i++;
//       population.sort((a, b) => {
//         return b.fitness - a.fitness;
//       });
//       if (population[0].fitness === 1) {
//         return [population[0].schedule];
//       }
//       const survivors = population.slice(0, 40);
//       const mutants = Array.from(Array(10), generateSchedule);
//       population = survivors.concat(mutants).map(mutate);
//       for (let i = 0; i < 50; i++) {
//         population.push(mutate(pickRandomItemFromArray(population)));
//       }
//     }
//     console.log("failed to find valid season", population[0].fitness);
//     return [population[0].schedule];
//   }
//   return loop();
// };
