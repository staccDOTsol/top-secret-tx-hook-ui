import Decimal from 'decimal.js';
import { Map } from 'immutable';

// Type definitions
type TokenGraph = Map<string, Map<string, Decimal>>;

interface BellmanFordResult {
  distances: Map<string, Decimal>;
  predecessors: Map<string, string>;
}

export function buildTokenGraph(routeMap: any, tokenMap: Map<string, any>): TokenGraph {
  let graph: TokenGraph = Map();

  for (const [inputMint, outputs] of Object.entries(routeMap)) {
    const outputMap = outputs as { [key: string]: any };
    let edges = Map<string, Decimal>();

    for (const [outputMint, marketInfo] of Object.entries(outputMap)) {
      // Use the actual exchange rate from the marketInfo
      const exchangeRate = new Decimal(marketInfo.rate || 1);
      edges = edges.set(outputMint, exchangeRate);
    }

    graph = graph.set(inputMint, edges);
  }

  return graph;
}

export async function findBestPath(graph: TokenGraph, start: string, maxHops: number): Promise<BellmanFordResult> {
  let distances = Map<string, Decimal>().set(start, new Decimal(1));
  let predecessors = Map<string, string>();

  for (let i = 0; i < maxHops; i++) {
    for (const [u, neighbors] of graph.entries()) {
      for (const [v, weight] of neighbors.entries()) {
        const distanceThroughU = (distances.get(u) || Decimal.min())?.mul(weight);
        if (distanceThroughU.gt(distances.get(v) || Decimal.min())) {
          distances = distances.set(v, distanceThroughU);
          predecessors = predecessors.set(v, u);
        }
      }
    }
  }

  return { distances, predecessors };
}