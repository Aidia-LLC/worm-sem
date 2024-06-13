import { createEffect, createSignal } from "solid-js";


export const Progress = (p: {num: number, total: number}) => {
    const [num, setNum] = createSignal(p.num);
    const [width, setWidth] = createSignal("1%");

    createEffect(() => {
        setWidth(`${(num() === 0 ? 0.005 : num() / p.total) * 100}%`);
    })

    createEffect(() => {
        const adjustNum =setInterval(() => {
            setNum(num() + .005)
        }, 1000)
        return () => clearInterval(adjustNum)
    })

    return (
        <div class="w-full h-2 rounded-full bg-white border align-middle justify-center items-center">
            <div class="h-full bg-green-500 rounded-full" style={{width: width()}}></div>
        </div>
    )
}


// import { MotiView } from "moti";
// import { Text } from "native-base";
// import { useEffect, useState } from "react";
// import { StyleSheet, View } from "react-native";

// export const ProgressBar = ({ num, total }: { num: number; total: number }) => {
//   const [width, setWidth] = useState("1%");

//   useEffect(() => {
//     setWidth(`${(num === 0 ? 0.1 : num / total) * 100}%`);
//   }, [num, total]);

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.headerText}>
//           Puzzles Completed: {num}/{total}
//         </Text>
//       </View>
//       <View style={styles.bar}>
//         <MotiView
//           key={num}
//           from={{ opacity: 0 }}
//           animate={{ opacity: 1, width }}
//           transition={{ type: "timing", duration: 500 }}
//           style={{ width: "100%", alignSelf: "flex-start" }}
//         >
//           <View
//             style={{
//               width: "100%",
//               height: 10,
//               borderRadius: 10,
//               backgroundColor: "#2b9267",
//             }}
//           />
//         </MotiView>
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     margin: 10,
//   },
//   header: {
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   headerText: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "white",
//   },
//   bar: {
//     marginTop: 10,
//     width: "100%",
//     height: 10,
//     borderRadius: 10,
//     backgroundColor: "#fff",
//     alignItems: "center",
//     justifyContent: "center",
//   },
// });
