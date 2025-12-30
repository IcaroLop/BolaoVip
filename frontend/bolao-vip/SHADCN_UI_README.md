# Shadcn/ui - Biblioteca de Componentes

## ✅ Instalação Concluída

A biblioteca **Shadcn/ui** foi instalada e configurada para o projeto.

### Dependências Instaladas
- `class-variance-authority` - Para variantes de estilos
- `clsx` - Para combinar classes CSS condicionalmente
- `tailwind-merge` - Para mesclar classes Tailwind
- `tailwindcss@3.4.1` - Já estava instalado

### Estrutura Criada

```
src/
├── lib/
│   └── utils.js          # Utilitário cn() para combinar classes
└── components/
    └── ui/
        ├── button.jsx    # Componente Button
        └── card.jsx      # Componente Card (Header, Title, Description, Content, Footer)
```

## 📦 Componentes Disponíveis

### 1. Button
```jsx
import { Button } from '@/components/ui/button'

// Uso
<Button>Clique aqui</Button>
<Button variant="destructive">Deletar</Button>
<Button variant="outline" size="lg">Grande</Button>
<Button variant="ghost">Sem borda</Button>
<Button disabled>Desabilitado</Button>
```

**Variantes:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
**Tamanhos:** `default`, `sm`, `lg`, `icon`

### 2. Card
```jsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

// Uso
<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
    <CardDescription>Descrição opcional</CardDescription>
  </CardHeader>
  <CardContent>
    Conteúdo principal
  </CardContent>
  <CardFooter>
    Rodapé
  </CardFooter>
</Card>
```

## 🔧 Como Adicionar Novos Componentes

Para adicionar mais componentes do Shadcn/ui (Input, Dialog, Select, etc.), siga este padrão:

1. Copie a estrutura do componente desejado
2. Crie o arquivo em `src/components/ui/nome-componente.jsx`
3. Importe a função `cn` do `@/lib/utils`
4. Use `React.forwardRef` para forwarding de refs
5. Combine as classes com `cn(...)`

## 📚 Referências

- [Documentação Shadcn/ui](https://ui.shadcn.com)
- [Documentação Tailwind CSS](https://tailwindcss.com)
- [Componentes disponíveis](https://ui.shadcn.com/docs/components)

## 💡 Dicas

- Use o alias `@/` para importações (já configurado)
- Os componentes usam Tailwind CSS, personalize via classes
- Todos os componentes suportam dark mode
- Componentes são totalmente acessíveis (ARIA compliant)

---

**Status:** ✅ Pronto para usar!
