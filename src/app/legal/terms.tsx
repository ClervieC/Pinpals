import { B, Item, LEGAL, LegalPage, P, Section } from '@/components/LegalPage';
import { lang } from '@/lib/i18n';

// Texte long : une version par langue plutôt que des dizaines de clés i18n.
export default function Terms() {
  return lang === 'fr' ? <TermsFr /> : <TermsEn />;
}

function TermsFr() {
  return (
    <LegalPage intro="En créant un compte Pinpals, tu acceptes ces conditions. Elles sont courtes, promis.">
      <Section title="Le service">
        <P>
          Pinpals est édité par {LEGAL.editor}. L&apos;app te permet de poser un pin sur ta ville, de rejoindre des groupes
          d&apos;amis, de suivre leurs anniversaires et de garder vos souvenirs. Le service est gratuit et fourni « en
          l&apos;état » : on fait de notre mieux pour qu&apos;il marche, sans garantie de disponibilité.
        </P>
      </Section>

      <Section title="Ton compte">
        <Item>Tu dois avoir au moins 15 ans pour créer un compte.</Item>
        <Item>Tu es responsable de ton mot de passe et de ce qui se passe sur ton compte.</Item>
        <Item>Les informations de ton profil doivent être les tiennes : pas d&apos;usurpation d&apos;identité.</Item>
      </Section>

      <Section title="Les groupes et invitations">
        <P>
          Un lien d&apos;invitation donne accès au groupe à toute personne qui le reçoit. Partage-le seulement avec les
          personnes concernées. Les admins d&apos;un groupe peuvent retirer des membres.
        </P>
      </Section>

      <Section title="Ce qui est interdit">
        <Item>Utiliser Pinpals pour suivre, harceler ou localiser quelqu&apos;un contre son gré.</Item>
        <Item>Publier des contenus illégaux, haineux, ou qui ne t&apos;appartiennent pas (photos, textes…).</Item>
        <Item>Identifier quelqu&apos;un sur un souvenir ou une photo contre son gré.</Item>
        <Item>Tenter d&apos;accéder aux données d&apos;autres utilisateurs ou de perturber le service.</Item>
        <P>
          En cas d&apos;abus, on peut suspendre ou supprimer un compte. Pour signaler un problème : {LEGAL.contact}.
        </P>
      </Section>

      <Section title="Tes contenus">
        <P>
          Tu restes propriétaire de ce que tu publies (photos, souvenirs, bio…). Tu nous autorises seulement à les afficher
          aux personnes concernées pour faire fonctionner l&apos;app.
        </P>
      </Section>

      <Section title="Fin et changements">
        <P>
          Tu peux arrêter d&apos;utiliser Pinpals et demander la suppression de ton compte à tout moment. Si ces conditions
          changent, on te prévient dans l&apos;app. Elles sont soumises au <B>droit français</B>.
        </P>
      </Section>
    </LegalPage>
  );
}

function TermsEn() {
  return (
    <LegalPage intro="By creating a Pinpals account, you accept these terms. They're short, promise.">
      <Section title="The service">
        <P>
          Pinpals is published by {LEGAL.editor}. The app lets you drop a pin on your city, join groups of friends, keep
          track of their birthdays and save your memories. The service is free and provided &quot;as is&quot;: we do our best
          to keep it running, with no availability guarantee.
        </P>
      </Section>

      <Section title="Your account">
        <Item>You must be at least 15 years old to create an account.</Item>
        <Item>You are responsible for your password and for what happens on your account.</Item>
        <Item>Your profile information must be your own: no impersonation.</Item>
      </Section>

      <Section title="Groups and invitations">
        <P>
          An invite link gives access to the group to anyone who receives it. Only share it with the people concerned. Group
          admins can remove members.
        </P>
      </Section>

      <Section title="What's not allowed">
        <Item>Using Pinpals to track, harass or locate someone against their will.</Item>
        <Item>Posting illegal or hateful content, or content that isn&apos;t yours (photos, text…).</Item>
        <Item>Tagging someone in a memory or photo against their will.</Item>
        <Item>Trying to access other users&apos; data or disrupt the service.</Item>
        <P>We may suspend or delete an account in case of abuse. To report a problem: {LEGAL.contact}.</P>
      </Section>

      <Section title="Your content">
        <P>
          You keep ownership of what you post (photos, memories, bio…). You only allow us to show it to the people concerned
          so the app can work.
        </P>
      </Section>

      <Section title="Ending and changes">
        <P>
          You can stop using Pinpals and ask for your account to be deleted at any time. If these terms change, we&apos;ll let
          you know in the app. They are governed by <B>French law</B>.
        </P>
      </Section>
    </LegalPage>
  );
}
