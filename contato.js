const SUPABASE_URL = "SUA_URL";
const SUPABASE_KEY = "SUA_PUBLISHABLE_KEY";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const form = document.getElementById("formContato");
const resultado = document.getElementById("resultado");

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const assunto = document.getElementById("assunto").value;
    const mensagem = document.getElementById("mensagem").value;

    const { data, error } = await supabaseClient
        .from("contatos")
        .insert([
            {
                nome: nome,
                email: email,
                assunto: assunto,
                mensagem: mensagem
            }
        ]);

    if (error) {
        console.error(error);
        resultado.innerText = "Não foi possível enviar a mensagem.";
        return;
    }

    resultado.innerText = "Mensagem enviada com sucesso!";
    form.reset();
});
