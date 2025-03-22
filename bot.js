const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ],
    partials: [Partials.GuildMember]
});


const professions = [
    "Alchemy", "Blacksmith", "Enchanting", "Engineering", "Herbalism", "Inscription", "Jewelcrafting",
    "Leatherworking", "Mining", "Skinning", "Tailoring"
];

const ALLOWED_CHANNEL_ID = process.env.ALLOWED_CHANNEL_ID;

client.once('ready', async () => {
    console.log(
        `Logged in as ${client.user.tag}!`
    );
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
        console.error('Guild not found');
        return;
    }

    const professionCommand = new SlashCommandBuilder()
        .setName("profession")
        .setDescription("Assigns or removes a profession role.")
        .addStringOption(option =>
            option.setName("name")
                .setDescription("The profession to assign or remove")
                .setRequired(true)
                .addChoices(
                    ...professions.map(profession => ({ name: profession, value: profession.toLowerCase() }))
                )
        );
    
    const newCraftCommand = new SlashCommandBuilder()
        .setName("newcraft")
        .setDescription("Request a crafted item.")
        .addStringOption(option =>
            option.setName("profession")
                .setDescription("The profession required")
                .setRequired(true)
                .addChoices(
                    ...professions.map(profession => ({ name: profession, value: profession.toLowerCase() }))
                )
        )
        .addStringOption(option =>
            option.setName("item")
                .setDescription("The item needed")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("ilvl")
                .setDescription("The item level required")
                .setRequired(true)
        );
    
    await guild.commands.set([professionCommand, newCraftCommand]);
    console.log("Slash commands registered.");
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "profession") {
        if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
            await interaction.reply({ content: `This command can only be used in the designated channel.`, ephemeral: true });
            return;
        }
        
        const profession = interaction.options.getString("name");
        const { guild, member } = interaction;
        const role = guild.roles.cache.find(r => r.name.toLowerCase() === profession);
        
        if (!role) {
            await interaction.reply({ content: `Role '${profession}' not found. Please create it first.`, ephemeral: true });
            return;
        }
        
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            await interaction.reply({ content: `You have been removed from the ${role.name} role!`, ephemeral: true });
        } else {
            await member.roles.add(role);
            await interaction.reply({ content: `You have been assigned the ${role.name} role!`, ephemeral: true });
        }
    }
    
    if (interaction.commandName === "newcraft") {
        const profession = interaction.options.getString("profession");
        const item = interaction.options.getString("item");
        const ilvl = interaction.options.getInteger("ilvl");
        const { guild } = interaction;
        
        const role = guild.roles.cache.find(r => r.name.toLowerCase() === profession);
        if (!role) {
            await interaction.reply({ content: `Role '${profession}' not found. Please create it first.`, ephemeral: true });
            return;
        }

        
        await guild.members.fetch();

        const membersWithRole = guild.members.cache.filter(member => member.roles.cache.has(role.id));

        if (membersWithRole.size === 0) {
            await interaction.reply({
                content: `I'm sorry, there is currently no **${profession}** here. Please check back later.`,
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("New Crafting Request")
            .setDescription(`A new crafting request has been made!`)
            .addFields(
                { name: "Profession", value: profession, inline: true },
                { name: "Item Needed", value: item, inline: true },
                { name: "Item Level", value: ilvl.toString(), inline: true }
            )
            .setColor("#FFD700")
            .setTimestamp();
        
        const message = await interaction.reply({ content: `${role}`, embeds: [embed], fetchReply: true });

        await message.react("✅");
        await message.react("❌");
    }
});




client.login(process.env.TOKEN);