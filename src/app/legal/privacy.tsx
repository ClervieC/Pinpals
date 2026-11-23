import { B, Item, LEGAL, LegalPage, P, Section } from '@/components/LegalPage';
import { lang } from '@/lib/i18n';

// Texte long : une version par langue plutôt que des dizaines de clés i18n.
export default function Privacy() {
  return lang === 'fr' ? <PrivacyFr /> : <PrivacyEn />;
}

function PrivacyFr() {
  return (
    <LegalPage intro="Pinpals sert à garder le lien avec tes amis, pas à les suivre. Cette page explique quelles données on collecte, pourquoi, et ce que tu peux en faire.">
      <Section title="Qui est responsable ?">
        <P>
          Le responsable du traitement est {LEGAL.editor}. Pour toute question sur tes données : {LEGAL.contact}.
        </P>
      </Section>

      <Section title="Les données qu'on collecte">
        <Item>
          <B>Ton compte</B> : ton adresse email et ton mot de passe. Le mot de passe est chiffré (haché) : personne ne peut
          le lire, nous compris.
        </Item>
        <Item>
          <B>Ton profil</B> : nom affiché, photo, couleur et emoji de ton pin et, si tu les remplis, ta bio, ton métier, ton
          entreprise, tes réseaux sociaux, ta date d&apos;anniversaire, tes favoris et ta liste d&apos;envies.
        </Item>
        <Item>
          <B>Ta ville</B> : la ville que tu choisis, jamais ta position GPS. Sur la carte, ton pin est placé près du
          centre-ville et décalé d&apos;environ 1 km par le serveur.
        </Item>
        <Item>
          <B>Ton adresse postale</B> (facultative) : jamais affichée sur la carte, visible uniquement par les amis que tu
          choisis.
        </Item>
        <Item>
          <B>Tes groupes et tes amis</B> : les groupes que tu crées ou rejoins, ton rôle, et les notes que tu prends sur tes
          amis (visibles par toi seul·e).
        </Item>
        <Item>
          <B>Tes souvenirs et voyages</B> : textes, dates, lieux, photos et personnes identifiées.
        </Item>
      </Section>

      <Section title="Pourquoi ?">
        <P>
          Uniquement pour faire fonctionner le service : te connecter, afficher ton pin et ta fiche à tes amis, gérer les
          invitations, te rappeler les anniversaires et partager vos souvenirs. Pas de publicité, pas de revente, pas de
          profilage.
        </P>
        <P>La base légale est l&apos;exécution du service que tu demandes en créant un compte (article 6.1.b du RGPD).</P>
      </Section>

      <Section title="Qui voit quoi ?">
        <P>
          Ton profil et ton pin ne sont visibles que par les personnes avec qui tu partages au moins un groupe. Un souvenir
          n&apos;est visible que par son public (le groupe ou les personnes concernées). Quelqu&apos;un qui a seulement un
          code d&apos;invitation voit le nom du groupe et son nombre de membres, pas leurs profils.
        </P>
      </Section>

      <Section title="Services tiers">
        <Item>
          <B>Hébergement</B> : les données et les photos sont stockées sur notre serveur Supabase.
        </Item>
        <Item>
          <B>Recherche de ville</B> : le texte que tu tapes est envoyé à Photon (komoot) pour trouver la ville.
        </Item>
        <Item>
          <B>Fonds de carte</B> : les tuiles sont chargées depuis MapTiler. Comme pour tout site web, ton adresse IP leur
          est transmise.
        </Item>
      </Section>

      <Section title="Combien de temps ?">
        <P>
          Tes données sont gardées tant que ton compte existe. Quand ton compte est supprimé, ton profil, ta ville, ton
          adresse, tes notes et tes photos sont effacés.
        </P>
      </Section>

      <Section title="Tes droits">
        <P>
          Tu peux accéder à tes données, les corriger, les supprimer, les exporter ou t&apos;opposer à leur traitement. La
          plupart se modifient directement dans « Mon profil ». Pour le reste, et pour supprimer ton compte, écris à{' '}
          {LEGAL.contact}.
        </P>
        <P>Si tu penses que tes droits ne sont pas respectés, tu peux saisir la CNIL (cnil.fr).</P>
      </Section>
    </LegalPage>
  );
}

function PrivacyEn() {
  return (
    <LegalPage intro="Pinpals helps you stay close to your friends, not track them. This page explains what data we collect, why, and what you can do about it.">
      <Section title="Who is responsible?">
        <P>
          The data controller is {LEGAL.editor}. For any question about your data: {LEGAL.contact}.
        </P>
      </Section>

      <Section title="What we collect">
        <Item>
          <B>Your account</B>: your email address and password. The password is hashed: nobody can read it, including us.
        </Item>
        <Item>
          <B>Your profile</B>: display name, photo, pin color and emoji and, if you fill them in, your bio, job, company,
          social links, birthday, favorites and wishlist.
        </Item>
        <Item>
          <B>Your city</B>: the city you pick, never your GPS position. On the map, your pin is placed near the city center
          and shifted by about 1 km by the server.
        </Item>
        <Item>
          <B>Your postal address</B> (optional): never shown on the map, visible only to the friends you choose.
        </Item>
        <Item>
          <B>Your groups and friends</B>: the groups you create or join, your role, and the notes you keep about friends
          (visible only to you).
        </Item>
        <Item>
          <B>Your memories and trips</B>: text, dates, places, photos and tagged people.
        </Item>
      </Section>

      <Section title="Why?">
        <P>
          Only to run the service: sign you in, show your pin and profile to your friends, handle invitations, remind you of
          birthdays and share your memories. No ads, no data selling, no profiling.
        </P>
        <P>The legal basis is the performance of the service you ask for by creating an account (GDPR art. 6.1.b).</P>
      </Section>

      <Section title="Who sees what?">
        <P>
          Your profile and pin are only visible to people you share at least one group with. A memory is only visible to its
          audience (the group or the people involved). Someone who only has an invite code sees the group name and member
          count, not the members&apos; profiles.
        </P>
      </Section>

      <Section title="Third-party services">
        <Item>
          <B>Hosting</B>: data and photos are stored on our Supabase server.
        </Item>
        <Item>
          <B>City search</B>: what you type is sent to Photon (komoot) to find the city.
        </Item>
        <Item>
          <B>Map tiles</B>: loaded from MapTiler. As with any website, your IP address is sent to them.
        </Item>
      </Section>

      <Section title="How long?">
        <P>
          Your data is kept as long as your account exists. When your account is deleted, your profile, city, address, notes
          and photos are erased.
        </P>
      </Section>

      <Section title="Your rights">
        <P>
          You can access, correct, delete or export your data, or object to its processing. Most of it can be edited
          directly in &quot;My profile&quot;. For the rest, and to delete your account, write to {LEGAL.contact}.
        </P>
        <P>If you believe your rights are not respected, you can contact your data protection authority.</P>
      </Section>
    </LegalPage>
  );
}
