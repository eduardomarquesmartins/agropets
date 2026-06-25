# Agente Local TEF

Este agente roda no computador do caixa e recebe pagamentos enviados pelo PDV web em:

```txt
http://127.0.0.1:8787/payment
```

Por enquanto ele roda em modo simulado para validar o fluxo do PDV. O conector real da Stone/PagBank deve ser implementado neste agente usando o SDK ou biblioteca homologada da maquininha.

## Rodar

```bash
cd tef-agent
npm start
```

## Variaveis

```env
TEF_AGENT_PORT=8787
TEF_AGENT_MOCK_ENABLED=true
```

Quando o SDK real estiver configurado:

```env
TEF_AGENT_MOCK_ENABLED=false
```

## Contrato de pagamento

Entrada:

```json
{
  "amount": 10,
  "provider": "Stone",
  "cardType": "Debito",
  "installments": 1,
  "reference": "uuid",
  "metadata": {}
}
```

Saida aprovada:

```json
{
  "status": "approved",
  "authorizationCode": "123456",
  "nsu": "1234567890",
  "provider": "Stone",
  "cardType": "Debito",
  "installments": 1,
  "brand": "Visa",
  "lastDigits": "1234"
}
```
