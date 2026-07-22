import { Config } from "effect"

// The single inventory of every knob the app has.
export const AppConfig = {
  port: Config.integer("PORT").pipe(Config.withDefault(3000)),
}
