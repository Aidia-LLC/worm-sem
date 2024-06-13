import { Match, Switch } from "solid-js";
import { Progress } from "./Progress";

export const ProgressBar = (p: {step: number}) => {
    console.log("STEP: ", p.step)
    return (
        <Switch>
            <Match when={p.step === 1}>
                <div>
                    <h1>Step 1/3: Finding the Ribbon...</h1>
                    <Progress num={0} total={3} />
                </div>
            </Match>
            <Match when={p.step === 2}>
            <div>
                <h1>Step 2/3: Finding Slices...</h1>
                    <Progress num={1} total={3} />
                </div>
            </Match>
            <Match when={p.step === 3}>
            <div>
                <h1>Step 3/3: Optimizing each slice...</h1>
                    <Progress num={2} total={3} />
                </div>
            </Match>
        </Switch>
    );
    }