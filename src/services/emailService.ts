export class EmailService {
  static async checkStatus(): Promise<{ configured: boolean; message: string; fromEmail?: string }> {
    try {
      const response = await fetch('/.netlify/functions/send-email', { headers: { Accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));
      return {
        configured: response.ok && Boolean(data.configured),
        message: data.message || 'Email service status checked.',
        fromEmail: data.fromEmail,
      };
    } catch {
      return { configured: false, message: 'Could not connect to the email service.' };
    }
  }

  /** The server looks up recipient and content from the stored appointment. */
  static async sendAppointmentConfirmation(appointmentId: string, salonSlug: string): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'booking-confirmation', appointmentId, salonSlug }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { success: false, error: data.error || 'Could not send the booking confirmation.' };
      return { success: true, status: data.status || 'sent' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Email service is unavailable.' };
    }
  }
}
