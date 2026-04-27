import { defineStore } from 'pinia'

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    balance: 0,
    investments: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchBalance() {
      this.loading = true;
      try {
        const response = await fetch('http://localhost:3000/api/wallet');
        const data = await response.json();
        this.balance = data.balance;
      } catch (err) {
        this.error = 'Error al conectar con la billetera';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    async fetchInvestments() {
      this.loading = true;
      try {
        const response = await fetch('http://localhost:3000/api/investments');
        const data = await response.json();
        this.investments = data;
      } catch (err) {
        this.error = 'Error al cargar inversiones';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    async createInvestment(amount, interestRate, gamesRequired) {
      this.loading = true;
      try {
        const response = await fetch('http://localhost:3000/api/investments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, interest_rate: interestRate, games_required: gamesRequired })
        });
        const data = await response.json();
        if (data.success) {
          this.balance = data.newBalance;
          this.investments.push(data.investment);
          return true;
        }
        return false;
      } catch (err) {
        this.error = 'Error al crear inversión';
        console.error(err);
        return false;
      } finally {
        this.loading = false;
      }
    },
    async completeGame(gameId) {
      try {
        const response = await fetch('http://localhost:3000/api/games/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId })
        });
        const data = await response.json();
        if (data.newBalance !== undefined) {
          this.balance = data.newBalance;
        }
        // Actualizar inversiones activas localmente o hacer refetch
        if (data.maturedInvestments && data.maturedInvestments.length > 0) {
          await this.fetchInvestments(); // Recargar para limpiar las completadas
        } else {
          // Increment locally to avoid extra fetch if no maturity happened
          this.investments = this.investments.map(inv => {
            return { ...inv, games_played_since_investment: inv.games_played_since_investment + 1 };
          });
        }
        return data; // Retorna info como { reward, isFirstTime, newBalance, maturedInvestments }
      } catch (err) {
        console.error('Error al registrar la victoria:', err);
        return null;
      }
    }
  }
})
