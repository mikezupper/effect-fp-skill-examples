import { css, html, LitElement } from "lit"
import { customElement, query, state } from "lit/decorators.js"
import { api, ApiError } from "../services/api.js"
import { refreshCart } from "../state/cart.js"
import { signIn } from "../state/session.js"
import { shared } from "../styles/shared.js"

@customElement("auth-dialog")
export class AuthDialog extends LitElement {
  @query("dialog") private dialog!: HTMLDialogElement
  @state() private mode: "login" | "register" = "login"
  @state() private error = ""
  @state() private busy = false

  static styles = [
    shared,
    css`
      dialog {
        inline-size: min(24rem, 92vw);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface-raised);
        color: var(--text);
        padding: var(--space);
        box-shadow: var(--shadow-high);
        transition:
          opacity 0.22s ease-out,
          scale 0.22s ease-out,
          overlay 0.22s ease-out allow-discrete,
          display 0.22s ease-out allow-discrete;
      }
      dialog:not([open]) {
        opacity: 0;
        scale: 0.96;
      }
      @starting-style {
        dialog[open] {
          opacity: 0;
          scale: 0.96;
        }
      }
      dialog::backdrop {
        background: oklch(15% 0.02 260 / 0.35);
        backdrop-filter: blur(3px);
      }
      .tabs {
        display: flex;
        gap: var(--space-s);
        margin-block-end: var(--space-s);
      }
      .tabs button {
        flex: 1;
        padding-block: 0.5em;
        border-block-end: 2px solid transparent;
        color: var(--text-muted);
        font-weight: 600;
      }
      .tabs button[aria-selected="true"] {
        color: var(--text);
        border-color: var(--brand);
      }
      form {
        display: grid;
        gap: var(--space-s);
      }
      label {
        display: grid;
        gap: 0.3rem;
        font-size: var(--step--1);
        font-weight: 600;
      }
      input {
        min-block-size: 44px;
        padding-inline: 0.8em;
        border: 1px solid var(--border);
        border-radius: var(--radius-s);
        background: var(--surface);
        color: var(--text);
        font-weight: 400;
      }
      /* Only complain after real interaction — :user-invalid, never :invalid. */
      input:user-invalid {
        border-color: var(--danger);
      }
      input:user-valid {
        border-color: var(--ok);
      }
      .err {
        color: var(--danger);
        font-size: var(--step--1);
        min-block-size: 1lh;
      }
      .hint {
        color: var(--text-muted);
        font-size: var(--step--1);
      }
    `,
  ]

  open() {
    this.error = ""
    this.dialog.showModal()
  }

  override render() {
    const login = this.mode === "login"
    return html`
      <dialog closedby="any" aria-label="Sign in or register">
        <div class="tabs" role="tablist">
          <button
            role="tab"
            aria-selected=${login}
            @click=${() => {
              this.mode = "login"
              this.error = ""
            }}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected=${!login}
            @click=${() => {
              this.mode = "register"
              this.error = ""
            }}
          >
            Register
          </button>
        </div>
        <form @submit=${(e: SubmitEvent) => void this.#submit(e)}>
          <label>
            Email
            <input name="email" type="email" required autocomplete="email" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minlength="8"
              autocomplete=${login ? "current-password" : "new-password"}
            />
          </label>
          ${login ? null : html`<p class="hint">At least 8 characters.</p>`}
          <p class="err" role="alert">${this.error}</p>
          <button class="btn" type="submit" ?disabled=${this.busy}>
            ${this.busy ? "…" : login ? "Sign in" : "Create account"}
          </button>
        </form>
      </dialog>
    `
  }

  async #submit(e: SubmitEvent) {
    e.preventDefault()
    const data = new FormData(e.target as HTMLFormElement)
    const email = String(data.get("email"))
    const password = String(data.get("password"))
    this.busy = true
    this.error = ""
    try {
      const session =
        this.mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password)
      signIn(session)
      await refreshCart()
      this.dialog.close()
    } catch (error) {
      this.error =
        error instanceof ApiError && error.tag === "EmailTaken"
          ? "That email is already registered — try signing in."
          : error instanceof ApiError && error.tag === "InvalidCredentials"
            ? "Wrong email or password."
            : "Something went wrong. Try again."
    } finally {
      this.busy = false
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "auth-dialog": AuthDialog
  }
}
